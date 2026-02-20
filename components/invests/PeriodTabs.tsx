'use client';

const PERIODS = ['1W', '1M', '3M', '1Y', 'ALL'] as const;
export type Period = (typeof PERIODS)[number];

interface PeriodTabsProps {
  selected: Period;
  onChange: (period: Period) => void;
}

export default function PeriodTabs({ selected, onChange }: PeriodTabsProps) {
  return (
    <div className="flex gap-1">
      {PERIODS.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
            selected === p
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
