/**
 * 感情10種類のモックデータ。単語選択/表示用コンポーネントのデータソースとして利用する。
 */
export const EMOTION_WORDS = [
  '嬉しい',
  '悲しい',
  '怒り',
  '驚き',
  '恐れ',
  '嫌悪',
  '信頼',
  '期待',
  '安心',
  '焦り',
] as const;

export type EmotionWord = (typeof EMOTION_WORDS)[number];
