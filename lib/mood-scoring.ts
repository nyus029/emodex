/**
 * 気分の深刻度（moodSeverity）を感情ワードから算出するモジュール。
 * 0.0 = とてもポジティブ、1.0 = とても深刻/ネガティブ。
 */

/** ネガティブ方向の感情ワードとそのスコア (高いほど深刻) */
const WORD_SEVERITY: Record<string, number> = {
  // ネガティブ
  悲しい: 0.8,
  怒り: 0.7,
  恐れ: 0.6,
  嫌悪: 0.7,
  焦り: 0.5,
  // ポジティブ (マイナス = 深刻度を下げる)
  嬉しい: -0.3,
  安心: -0.4,
  信頼: -0.2,
  期待: -0.1,
  // ニュートラル
  驚き: 0.1,
};

/** デフォルト severity（辞書にないワード用） */
const DEFAULT_SEVERITY = 0.2;

/**
 * 感情ワード配列から moodSeverity を算出する。
 * @returns 0.0〜1.0 にクランプされた値
 */
export function calculateMoodSeverity(words: string[]): number {
  if (words.length === 0) return 0.5;

  const total = words.reduce((sum, word) => {
    const trimmed = word.trim();
    return sum + (WORD_SEVERITY[trimmed] ?? DEFAULT_SEVERITY);
  }, 0);

  const avg = total / words.length;
  return Math.max(0, Math.min(1, (avg + 0.4) / 1.2));
}
