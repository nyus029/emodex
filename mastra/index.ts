import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import {
  Observability,
  DefaultExporter,
  CloudExporter,
  SensitiveDataFilter,
} from '@mastra/observability';
import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';
import { chatAgent } from './agents/chat-agent';
import { sentenceAgent } from './agents/sentence-agent';

const mastraStorageUrl =
  process.env.TURSO_DATABASE_URL?.trim() ||
  (process.env.VERCEL === '1' ? 'file:/tmp/mastra.db' : 'file:./mastra.db');
const mastraStorageAuthToken =
  process.env.TURSO_AUTH_TOKEN?.trim() || undefined;

/** 'turso' | 'file_tmp' | 'file' for health/debug. Avoids 405 on Vercel when Turso is unset. */
export const mastraStorageKind = mastraStorageUrl.startsWith('libsql://')
  ? 'turso'
  : mastraStorageUrl.startsWith('file:/tmp/')
    ? 'file_tmp'
    : 'file';

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { weatherAgent, chatAgent, sentenceAgent },
  storage: new LibSQLStore({
    id: 'mastra-storage',
    url: mastraStorageUrl,
    ...(mastraStorageAuthToken && { authToken: mastraStorageAuthToken }),
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new DefaultExporter(), // Persists traces to storage for Mastra Studio
          new CloudExporter(), // Sends traces to Mastra Cloud (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
