import { requireAuth, jsonError } from '@/lib/api-utils';
import { EMO_BOOST_COMMENT_PROMPT } from '@/mastra/prompts/mood-prompts';

const encoder = new TextEncoder();

function createMockStream(albumName: string, boostPercentage: number) {
  const text = `${albumName}のエモ価が+${boostPercentage}%の爆上がり！ストップ高間近です！`;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as {
    albumName?: string;
    emoBoostPercentage?: number;
  };

  const albumName = body.albumName?.trim();
  const boostPercentage = body.emoBoostPercentage ?? 50;

  if (!albumName) {
    return jsonError('albumName is required', 400);
  }

  if (!process.env.OPENAI_API_KEY) {
    return new Response(createMockStream(albumName, boostPercentage), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }

  let mastra;
  try {
    const mod = await import('@/mastra');
    mastra = mod.mastra;
  } catch (err) {
    console.error('Mastra init error (emo boost stream):', err);
    return new Response(createMockStream(albumName, boostPercentage), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }

  const agent = mastra.getAgent('chatAgent');
  if (!agent) {
    return new Response(createMockStream(albumName, boostPercentage), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }

  const prompt = EMO_BOOST_COMMENT_PROMPT(albumName, boostPercentage);
  const stream = await agent.stream([{ role: 'user', content: prompt }]);

  const textStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const chunk of stream.textStream) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(textStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
