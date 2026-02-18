'use client';

import { useEffect, useState } from 'react';
import HealthStatus from '@/components/health/HealthStatus';

export default function HealthFeature() {
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((response) => response.json())
      .then(setData);
  }, []);

  return <HealthStatus data={data} />;
}
