type HealthStatusProps = {
  data: unknown;
};

export default function HealthStatus({ data }: HealthStatusProps) {
  return <pre>{JSON.stringify(data)}</pre>;
}
