import InsightFeature from '@/features/invests/InsightFeature';

export default async function InsightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InsightFeature albumId={id} />;
}
