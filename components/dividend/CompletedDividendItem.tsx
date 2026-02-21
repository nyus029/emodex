import Image from 'next/image';
import Link from 'next/link';

interface CompletedDividendItemProps {
  dividendEventId: string;
  albumName: string;
  albumType: string;
  photoStorageName: string;
  action: 'REINVEST' | 'RECEIVE';
  emoValueAtEvent: number;
  executedAt: string;
  thumbnailUrl: string | null;
}

export default function CompletedDividendItem({
  dividendEventId,
  albumName,
  albumType,
  photoStorageName,
  action,
  emoValueAtEvent,
  executedAt,
  thumbnailUrl,
}: CompletedDividendItemProps) {
  const date = new Date(executedAt);
  const formattedDate = date.toLocaleDateString('ja-JP');
  const peopleIcon = albumType === 'SHARED' ? '/users.svg' : '/user.svg';

  return (
    <Link
      href={`/dividend/${dividendEventId}`}
      className="block rounded-xl bg-white px-4 py-3 shadow-card transition-colors hover:bg-gray-50"
    >
      <div className="flex items-center gap-4">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt="thumbnail"
            className="h-16 w-16 shrink-0 rounded-xl object-cover"
            loading="lazy"
          />
        ) : (
          <Image
            src="/mockphoto.png"
            alt="thumbnail"
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-xl object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Image
              src={peopleIcon}
              alt="user"
              width={20}
              height={20}
              className="shrink-0"
            />
            <div className="truncate text-[15px] font-medium text-gray-900">
              {albumName}
            </div>
          </div>
          <div className="mt-1 space-y-1 text-[13px] text-gray-800">
            <div className="flex gap-3">
              <span className="w-12 text-gray-500">配当日</span>
              <span className="tabular-nums">{formattedDate}</span>
            </div>
            <div className="flex gap-3">
              <span className="w-12 text-gray-500">期限</span>
              <span className="truncate">{photoStorageName}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span
          className={`rounded px-1.5 py-0.5 font-medium ${
            action === 'REINVEST'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {action === 'REINVEST' ? '再投資' : '受取'}
        </span>
        <span className="text-gray-500">
          {Math.round(emoValueAtEvent).toLocaleString()} emo
        </span>
      </div>
    </Link>
  );
}
