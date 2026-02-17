import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

export const chatAgent = new Agent({
  id: 'chat-agent',
  name: 'Chat Agent',
  instructions:
    'You are a concise and helpful assistant. Keep responses short and practical for local app testing.',
  model: process.env.OPENAI_MODEL ?? 'openai/gpt-5-codex',
  memory: new Memory(),
});
