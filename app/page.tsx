'use client';

import { useMemo, useState } from 'react';

type EmotionEntry = {
  id: number;
  word: string;
  category: 'positive' | 'negative' | 'neutral';
  intensity: number;
  nuance: string;
  trigger: string;
};

const prototypeData: EmotionEntry[] = [
  {
    id: 1,
    word: 'わくわく',
    category: 'positive',
    intensity: 5,
    nuance: '未来への期待が高く、行動意欲もある状態',
    trigger: '新しい企画のキックオフ',
  },
  {
    id: 2,
    word: 'もやもや',
    category: 'neutral',
    intensity: 3,
    nuance: '理由が曖昧で、言語化しづらい違和感',
    trigger: '仕様の優先順位が曖昧',
  },
  {
    id: 3,
    word: 'いらいら',
    category: 'negative',
    intensity: 4,
    nuance: '期待とのギャップから生じる緊張と苛立ち',
    trigger: 'レビュー待ちで進捗が止まる',
  },
  {
    id: 4,
    word: 'ほっとする',
    category: 'positive',
    intensity: 2,
    nuance: '負荷が下がって安心できている状態',
    trigger: '障害対応が落ち着いた',
  },
  {
    id: 5,
    word: '不安',
    category: 'negative',
    intensity: 5,
    nuance: '不確実性の高い状況で先行きが見えない感覚',
    trigger: 'リリース前の最終チェック',
  },
  {
    id: 6,
    word: '集中',
    category: 'neutral',
    intensity: 4,
    nuance: '感情の揺れが小さく、課題に没頭できる状態',
    trigger: '静かな時間に設計作業',
  },
];

const categoryLabel: Record<EmotionEntry['category'], string> = {
  positive: 'ポジティブ',
  negative: 'ネガティブ',
  neutral: 'ニュートラル',
};

const categoryColor: Record<EmotionEntry['category'], string> = {
  positive: 'bg-emerald-100 text-emerald-700',
  negative: 'bg-rose-100 text-rose-700',
  neutral: 'bg-sky-100 text-sky-700',
};

export default function Home() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<EmotionEntry['category'] | 'all'>('all');

  const filtered = useMemo(() => {
    return prototypeData.filter((entry) => {
      const matchQuery =
        query.trim().length === 0 ||
        entry.word.includes(query) ||
        entry.nuance.includes(query) ||
        entry.trigger.includes(query);
      const matchCategory =
        selectedCategory === 'all' || selectedCategory === entry.category;
      return matchQuery && matchCategory;
    });
  }, [query, selectedCategory]);

  const avgIntensity =
    filtered.length === 0
      ? 0
      : Math.round(
          (filtered.reduce((sum, item) => sum + item.intensity, 0) /
            filtered.length) *
            10,
        ) / 10;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900 sm:px-10 lg:px-16">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            issue #6 prototype
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            EmoDex 感情辞書プロトタイプ
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            入力したキーワードやカテゴリで感情語を絞り込み、強度やニュアンスを確認するための最小UIです。
            データはモックで、将来的にDB保存・Mastraエージェント連携へ拡張する前提です。
          </p>
        </section>

        <section className="grid gap-4 rounded-2xl bg-white p-6 shadow-sm sm:grid-cols-[2fr_1fr] sm:p-8">
          <label className="flex flex-col gap-2 text-sm font-medium">
            キーワード検索
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="例: 不安 / 仕様 / 集中"
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-indigo-500 transition focus:ring-2"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            カテゴリ
            <select
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(
                  event.target.value as EmotionEntry['category'] | 'all',
                )
              }
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-indigo-500 transition focus:ring-2"
            >
              <option value="all">すべて</option>
              <option value="positive">ポジティブ</option>
              <option value="negative">ネガティブ</option>
              <option value="neutral">ニュートラル</option>
            </select>
          </label>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-xs text-slate-500">ヒット件数</p>
            <p className="mt-2 text-3xl font-semibold">{filtered.length}</p>
          </article>
          <article className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-xs text-slate-500">平均強度</p>
            <p className="mt-2 text-3xl font-semibold">{avgIntensity}</p>
          </article>
          <article className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-xs text-slate-500">状態</p>
            <p className="mt-2 text-lg font-semibold text-indigo-700">
              {filtered.length === 0
                ? '検索条件を調整してください'
                : '候補が見つかりました'}
            </p>
          </article>
        </section>

        <section className="grid gap-4">
          {filtered.map((entry) => (
            <article
              key={entry.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{entry.word}</h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${categoryColor[entry.category]}`}
                >
                  {categoryLabel[entry.category]}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{entry.nuance}</p>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">トリガー例</dt>
                  <dd className="font-medium">{entry.trigger}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">感情強度（1-5）</dt>
                  <dd className="font-medium">{entry.intensity}</dd>
                </div>
              </dl>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
