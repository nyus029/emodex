import Image from 'next/image';

type User = {
  id: number;
  name: string;
  dividendDay: string;
  deadline: string;
};

const mockUsers: User[] = [
  {
    id: 1,
    name: '仲良し4人組',
    dividendDay: '2026-02-21',
    deadline: '2026-04-21',
  },
  { id: 2, name: '家族', dividendDay: '2026-01-15', deadline: '2026-03-30' },
  { id: 3, name: '友人', dividendDay: '2026-03-05', deadline: '2026-05-10' },
  {
    id: 4,
    name: '旅行メンバー',
    dividendDay: '2026-02-01',
    deadline: '2026-04-01',
  },
  {
    id: 5,
    name: 'カフェ仲間',
    dividendDay: '2026-01-28',
    deadline: '2026-04-15',
  },
  {
    id: 6,
    name: '朝のお散歩会',
    dividendDay: '2026-03-20',
    deadline: '2026-05-25',
  },
];

function formatJPDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}/${m}/${d}`;
}

export default function DividendMockFeature() {
  return (
    <div className="min-h-screen bg-background-light p-5">
      <div className="mx-auto max-w-md space-y-4">
        {mockUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-4 rounded-xl bg-white px-4 py-3 shadow-card"
          >
            <Image
              src="/mockphoto.png"
              alt="thumbnail"
              width={64}
              height={64}
              className="h-16 w-16 shrink-0 rounded-xl object-cover"
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Image
                  src="/users.svg"
                  alt="user"
                  width={20}
                  height={20}
                  className="shrink-0"
                />

                <div className="truncate text-[15px] font-medium text-gray-900">
                  {user.name}
                </div>
              </div>

              <div className="mt-1 space-y-1 text-[13px] text-gray-800">
                <div className="flex gap-3">
                  <span className="w-12 text-gray-500">配当日</span>
                  <span className="tabular-nums">
                    {formatJPDate(user.dividendDay)}
                  </span>
                </div>

                <div className="flex gap-3">
                  <span className="w-12 text-gray-500">期限</span>
                  <span className="tabular-nums">
                    {formatJPDate(user.deadline)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
