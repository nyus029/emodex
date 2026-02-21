import Link from 'next/link';

interface CompletedDividendItemProps {
  dividendEventId: string;
  albumName: string;
  photoStorageName: string;
  action: 'REINVEST' | 'RECEIVE';
  emoValueAtEvent: number;
  executedAt: string;
}

export default function CompletedDividendItem({
  dividendEventId,
  albumName,
  photoStorageName,
  action,
  emoValueAtEvent,
  executedAt,
}: CompletedDividendItemProps) {
  const date = new Date(executedAt);

  return (
    <Link
      href={`/dividend/${dividendEventId}`}
      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
    >
      <div className="grid gap-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{photoStorageName}</span>
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${
              action === 'REINVEST'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}
          >
            {action === 'REINVEST' ? '再投資' : '受取'}
          </span>
        </div>
        <span className="text-xs text-zinc-500">{albumName}</span>
      </div>
      <div className="grid gap-0.5 text-right">
        <span className="font-medium">
          {Math.round(emoValueAtEvent).toLocaleString()}{' '}
          <span className="text-xs font-normal text-zinc-500">emo</span>
        </span>
        <span className="text-xs text-zinc-500">
          {date.toLocaleDateString('ja-JP')}
        </span>
      </div>
    </Link>
  );
}
