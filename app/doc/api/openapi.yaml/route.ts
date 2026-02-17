import { readFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  const filePath = path.join(
    process.cwd(),
    'public',
    'doc',
    'api',
    'openapi.yaml',
  );

  const content = await readFile(filePath, 'utf8');

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'application/yaml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
