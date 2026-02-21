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
          className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
            selected === p
              ? 'bg-green text-white'
              : 'bg-light-gray text-gray-500 active:bg-gray-200'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
