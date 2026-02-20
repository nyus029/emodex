import type { Agent } from '@mastra/core/agent';

type GenerateSentenceOptions = {
  agent?: Agent;
};

function buildFallbackSentence(words: string[]): string {
  const joined = words.join(' ');
  return joined.endsWith('.') || joined.endsWith('。') ? joined : `${joined}.`;
}

export async function generateSentenceFromWords(
  words: string[],
  options: GenerateSentenceOptions = {},
): Promise<string> {
  const normalized = words.map((word) => word.trim()).filter(Boolean);
  if (normalized.length === 0) {
    throw new Error('words array must include at least one non-empty word');
  }

  const agent =
    options.agent ?? (await getDefaultAgent(process.env.OPENAI_API_KEY));

  if (!agent) {
    return buildFallbackSentence(normalized);
  }

  const prompt = `次の単語をすべて使い、自然で短い一文を作ってください。単語: ${normalized.join('、')}`;

  try {
    const { text } = await agent.generate([{ role: 'user', content: prompt }]);
    const trimmed = text.trim();
    return trimmed || buildFallbackSentence(normalized);
  } catch {
    return buildFallbackSentence(normalized);
  }
}

async function getDefaultAgent(
  openAiApiKey?: string,
): Promise<Agent | undefined> {
  if (!openAiApiKey) {
    return undefined;
  }

  try {
    const { mastra } = await import('@/mastra');
    return mastra.getAgent('chatAgent');
  } catch {
    return undefined;
  }
}
