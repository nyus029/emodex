const encoder = new TextEncoder();

async function getMastra() {
  const { mastra } = await import('@/mastra');
  return mastra;
}

function createMockStream(message: string) {
  const chunks = [
    'これはモック応答です。',
    'OPENAI_API_KEY を設定すると Codex モデルに切り替わります。',
    `受け取ったメッセージ: ${message}`,
  ];

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`${chunk}\n`));
        await new Promise((resolve) => setTimeout(resolve, 180));
      }
      controller.close();
    },
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { message?: string };
  const message = body.message?.trim();

  if (!message) {
    return Response.json({ error: 'message is required' }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return new Response(createMockStream(message), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }

  let mastra;
  try {
    mastra = await getMastra();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Mastra init error (chat stream):', msg);
    if (err instanceof Error && err.stack) console.error(err.stack);
    return Response.json(
      { error: 'Mastra storage failed to initialize.', details: msg },
      { status: 500 },
    );
  }

  const agent = mastra.getAgent('chatAgent');
  if (!agent) {
    return Response.json(
      { error: 'chatAgent is not configured' },
      { status: 500 },
    );
  }

  const stream = await agent.stream([{ role: 'user', content: message }]);

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
