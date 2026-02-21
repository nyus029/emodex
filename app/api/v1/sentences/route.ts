import { sentenceFromWordsTool } from '@/mastra/tools/sentence-from-words-tool';
import { NextRequest, NextResponse } from 'next/server';

// 例: キーが「ある/ない」だけ確認（値はログに出さない）
console.log('OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
/**
 * 文章生成は sentence-from-words-tool に委譲する。ツール内でモック/Claude を完結。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { words } = body;

    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json(
        { error: 'words array is required' },
        { status: 400 },
      );
    }

    const wordList = words.filter(
      (w: unknown) => typeof w === 'string' && (w as string).trim().length > 0,
    ) as string[];
    if (wordList.length === 0) {
      return NextResponse.json(
        { error: 'At least one non-empty word is required' },
        { status: 400 },
      );
    }

    if (!sentenceFromWordsTool.execute) {
      return NextResponse.json(
        { error: 'Tool execute is not available' },
        { status: 500 },
      );
    }

    const result = await sentenceFromWordsTool.execute({ words: wordList }, {});

    if (result && 'error' in result && result.error === true) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in sentence generation API:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal Server Error', details: message },
      { status: 500 },
    );
  }
}
