import { mastra } from '@/mastra';
import { z } from 'zod';

const encoder = new TextEncoder();

const bodySchema = z.object({
  words: z.array(z.string()).min(1, 'At least one word is required'),
});

const PROMPT_TEMPLATE = (wordList: string[]) =>
  `以下の単語を全て含む、意味の通った日本語の文章を1文だけ作成してください。
単語: ${wordList.join(', ')}

要件:
- すべての単語を含めてください
- 自然で意味のある文章にしてください
- 1文だけ生成してください
- 句点で終わってください

文章のみを出力してください。`;

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    const msg = parsed.error.message ?? 'Validation failed';
    return Response.json({ error: msg }, { status: 400 });
  }

  const wordList = parsed.data.words.filter(
    (w) => typeof w === 'string' && w.trim().length > 0,
  );
  if (wordList.length === 0) {
    return Response.json(
      { error: 'At least one non-empty word is required' },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        error:
          'OPENAI_API_KEY is not set. Set it to use Codex for sentence streaming.',
      },
      { status: 503 },
    );
  }

  const agent = mastra.getAgent('chatAgent');
  if (!agent) {
    return Response.json(
      {
        error: 'chatAgent is not configured',
        details: 'Check mastra/index.ts.',
      },
      { status: 500 },
    );
  }

  try {
    const stream = await agent.stream([
      { role: 'user', content: PROMPT_TEMPLATE(wordList) },
    ]);

    const textStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream.textStream) {
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (err) {
          console.error('Sentence stream error:', err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(textStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const fullMessage =
      err instanceof Error && err.cause instanceof Error
        ? `${message}; cause: ${err.cause.message}`
        : message;
    console.error('Sentence stream API error:', fullMessage);
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }

    const isAuthOrProviderError =
      /authentication|API key|InvalidApiKey|401|api_key|LLM service|Please check API keys/i.test(
        fullMessage,
      ) || /model.*required|provider|OPENAI/i.test(fullMessage);

    if (isAuthOrProviderError) {
      return Response.json(
        {
          error:
            'OPENAI_API_KEYを設定・確認してください。認証またはプロバイダーエラーです。',
          details: fullMessage,
        },
        { status: 503 },
      );
    }

    return Response.json(
      { error: 'Stream failed', details: fullMessage },
      { status: 500 },
    );
  }
}
