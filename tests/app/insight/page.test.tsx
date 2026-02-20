/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import InsightPage from '@/app/test/insight/page';

jest.mock('@/features/graph/GraphFeature', () => ({
  __esModule: true,
  default: () => <div>GraphFeatureMock</div>,
}));

describe('/insight page', () => {
  it('renders GraphFeature component', async () => {
    const jsx = await InsightPage();
    render(jsx);

    expect(screen.getByText('GraphFeatureMock')).toBeInTheDocument();
  });
});
