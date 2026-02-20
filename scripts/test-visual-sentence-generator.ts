import { sentenceFromWordsTool } from '../mastra/tools/sentence-from-words-tool';

async function visualTest() {
  console.log('\n===========================================');
  console.log('📝 Sentence Generator Tool - Visual Test');
  console.log('===========================================\n');

  const testCases = [
    { words: ['猫', '走る', '公園'], description: '3語のテスト' },
    { words: ['プログラミング'], description: '1語のテスト' },
    { words: ['AI', '学習', '成長', '技術'], description: '4語のテスト' },
    { words: ['天気', '雨', '傘'], description: '関連する3語' },
  ];

  for (let i = 0; i < testCases.length; i++) {
    const { words, description } = testCases[i];
    console.log(`\n【テスト ${i + 1}】${description}`);
    console.log(`入力単語: ${JSON.stringify(words)}`);
    console.log('-'.repeat(50));

    try {
      if (!sentenceFromWordsTool.execute) {
        throw new Error('Tool execute method is not defined');
      }
      const result = await sentenceFromWordsTool.execute(
        { words },
        {} as Parameters<NonNullable<typeof sentenceFromWordsTool.execute>>[1],
      );

      if ('error' in result) {
        throw new Error(`Validation Error: ${result.message}`);
      }

      console.log(`✅ 成功！`);
      console.log(`   文章: "${result.sentence}"`);
      console.log(`   単語数: ${result.wordCount}`);
      console.log(`   使用単語: ${result.usedWords.join(', ')}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (
        errorMsg.includes('authentication_error') ||
        errorMsg.includes('ANTHROPIC_API_KEY')
      ) {
        console.log(`⚠️  スキップ（API キーが必要）`);
        console.log(`   理由: ${errorMsg.substring(0, 80)}...`);
      } else {
        console.log(`❌ エラー: ${errorMsg}`);
      }
    }
  }

  console.log('\n===========================================');
  console.log('✨ テスト完了\n');
}

visualTest().catch(console.error);
