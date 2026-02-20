import { sentenceGeneratorAgent } from '../agents/sentence-generator-agent';

async function testSentenceGenerator() {
  console.log('Testing Sentence Generator Agent...\n');

  try {
    const result = await sentenceGeneratorAgent.execute({
      messages: [
        {
          role: 'user',
          content:
            '次の単語から意味のある文章を作成してください: 猫、走る、公園',
        },
      ],
    });

    console.log('✅ テスト成功！\n');
    console.log('生成された文章:', result);
  } catch (error) {
    console.error('❌ テスト失敗:', error);
  }
}

testSentenceGenerator();
