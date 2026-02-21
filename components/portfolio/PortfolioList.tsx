type PortfolioItem = {
  id: number;
  name: string;
};

type PortfolioListProps = {
  items: PortfolioItem[];
  emptyMessage: string;
};

export default function PortfolioList({
  items,
  emptyMessage,
}: PortfolioListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-white p-4 text-sm text-gray-700 shadow-card">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-2 rounded-xl bg-white p-4 shadow-card"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-light-gray">
            <svg className="h-4 w-4" viewBox="0 0 24 24" />
          </div>

          <div className="font-medium text-gray-800">{item.name}</div>
        </div>
      ))}
    </>
  );
}
