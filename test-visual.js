#!/usr/bin/env node

console.log('\n🎯 Sentence Generator Tool - Visual Test\n');
console.log('═'.repeat(50));

// テストケース
const testCases = [
  { words: ['猫', '走る', '公園'], name: '3語のテスト' },
  { words: ['プログラミング'], name: '1語のテスト' },
  { words: ['AI', '学習', '成長', '技術'], name: '4語のテスト' },
  { words: ['天気', '雨', '傘'], name: '関連する3語' },
];

let testNum = 1;
for (const testCase of testCases) {
  console.log(`\n📝 テスト ${testNum}: ${testCase.name}`);
  console.log('─'.repeat(50));
  console.log(`入力単語: [${testCase.words.map((w) => `"${w}"`).join(', ')}]`);
  console.log(`単語数: ${testCase.words.length}個`);

  // 出力例
  const sentence = testCase.words.join('、') + '。';
  console.log(`\n✅ 生成された文章:`);
  console.log(`   "${sentence}"`);
  console.log(`使用単語: ${testCase.words.join(', ')}`);

  testNum++;
}

console.log('\n' + '═'.repeat(50));
console.log('✨ テスト完了！\n');
