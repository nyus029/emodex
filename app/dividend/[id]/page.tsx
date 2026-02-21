import DividendDetailFeature from '@/features/dividend/DividendDetailFeature';

export default async function DividendDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DividendDetailFeature eventId={id} />;
}
