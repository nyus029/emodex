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
    const result = await sentenceFromWordsTool.execute({ words });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in sentence generation API:', error);

    // Handle potential authentication errors from Anthropic
    if (error?.status === 401 || error?.message?.includes('api-key')) {
      return NextResponse.json(
        { error: 'LLM service authentication failed. Please check API keys.' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message },
      { status: 500 },
    );
  }
}
