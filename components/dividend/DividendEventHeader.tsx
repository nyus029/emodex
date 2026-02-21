interface DividendEventHeaderProps {
  action: 'REINVEST' | 'RECEIVE';
  emoValueAtEvent: number;
  previousBaseEmo: number;
  newBaseEmo: number;
  executedAt: string;
  albumName: string;
  photoStorageName: string;
}

export default function DividendEventHeader({
  action,
  emoValueAtEvent,
  previousBaseEmo,
  newBaseEmo,
  executedAt,
  albumName,
  photoStorageName,
}: DividendEventHeaderProps) {
  const date = new Date(executedAt);

  return (
    <div className="grid gap-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="grid gap-1">
          <p className="text-xs text-zinc-500">{albumName}</p>
          <p className="text-lg font-medium">{photoStorageName}</p>
        </div>
        <span
          className={`rounded px-2 py-1 text-sm font-medium ${
            action === 'REINVEST'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          }`}
        >
          {action === 'REINVEST' ? '再投資' : '受取'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-zinc-500">配当時エモ価</p>
          <p className="text-lg font-bold">
            {Math.round(emoValueAtEvent).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">基準価格</p>
          <p className="text-sm">
            {previousBaseEmo} → {newBaseEmo}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">実行日</p>
          <p className="text-sm">{date.toLocaleDateString('ja-JP')}</p>
        </div>
      </div>
    </div>
  );
}
