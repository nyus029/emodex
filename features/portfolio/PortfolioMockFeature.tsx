import PortfolioList from '@/components/portfolio/PortfolioList';

const mockUsers = [
  { id: 1, name: '名前' },
  { id: 2, name: '仲良し4人組' },
  { id: 3, name: '家族' },
  { id: 4, name: '友人' },
  { id: 5, name: '海めぐり' },
  { id: 6, name: 'カフェ' },
  { id: 7, name: '旅行' },
  { id: 8, name: '朝のお散歩' },
  { id: 9, name: 'いぬ' },
  { id: 10, name: 'その他' },
];

export default function PortfolioMockFeature() {
  return (
    <div className="bg-background-light p-5">
      <div className="mx-auto max-w-md space-y-4">
        <PortfolioList
          items={mockUsers}
          emptyMessage="表示できるユーザーがありません。"
        />
      </div>
    </div>
  );
}
