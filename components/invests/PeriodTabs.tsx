'use client';

import { type KeyboardEvent, useRef } from 'react';

const PERIODS = ['1W', '1M', '3M', '1Y', 'ALL'] as const;
export type Period = (typeof PERIODS)[number];

interface PeriodTabsProps {
  selected: Period;
  onChange: (period: Period) => void;
}

export default function PeriodTabs({ selected, onChange }: PeriodTabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }

    event.preventDefault();

    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + direction + PERIODS.length) % PERIODS.length;
    const nextPeriod = PERIODS[nextIndex];

    onChange(nextPeriod);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex gap-1" role="tablist" aria-label="期間タブ">
      {/* eslint-disable jsx-a11y/role-supports-aria-props */}
      {PERIODS.map((p, index) => (
        <button
          key={p}
          ref={(element) => {
            tabRefs.current[index] = element;
          }}
          type="button"
          role="tab"
          tabIndex={selected === p ? 0 : -1}
          aria-selected={selected === p}
          aria-pressed={selected === p}
          aria-label={`${p}を表示`}
          onClick={() => onChange(p)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
            selected === p
              ? 'bg-green text-white'
              : 'bg-light-gray text-gray-500 active:bg-gray-200'
          }`}
        >
          {p}
        </button>
      ))}
      {/* eslint-enable jsx-a11y/role-supports-aria-props */}
    </div>
  );
}
