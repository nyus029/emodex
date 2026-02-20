import { sentenceFromWordsTool } from '@/mastra/tools/sentence-from-words-tool';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { words } = body;

    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json(
        { error: 'words array is required' },
        { status: 400 },
      );
    }

    // Execute the tool with the provided words
    if (!sentenceFromWordsTool.execute) {
      throw new Error('Tool execute method is not defined');
    }

    const result = await sentenceFromWordsTool.execute({ words }, {} as any);

    if ('error' in result && result.error === true) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in sentence generation API:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStatus = (error as { status?: number })?.status;

    // Handle potential authentication errors from Anthropic
    if (errorStatus === 401 || errorMessage.includes('api-key')) {
      return NextResponse.json(
        { error: 'LLM service authentication failed. Please check API keys.' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 },
    );
  }
}
