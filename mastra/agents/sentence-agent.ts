import { Agent } from '@mastra/core/agent';

/**
 * Claude モデルで、指定された単語を全て含む1文を日本語で生成するエージェント。
 * ANTHROPIC_API_KEY 未設定時はルート（POST /api/v1/sentences/stream）で 503 を返すため、ここでは常にモデルを指定する。
 */
export const sentenceAgent = new Agent({
  id: 'sentence-agent',
  name: 'Sentence Agent',
  instructions: `あなたは、指定された単語を全て含む、自然な日本語の文章を1文だけ生成するアシスタントです。
与えられた単語を漏れなく含め、意味の通る1文にまとめてください。句点で終えてください。文章のみを出力し、説明や余計な文言は付けないでください。`,
  model: 'anthropic/claude-3-5-sonnet-20241022',
});
