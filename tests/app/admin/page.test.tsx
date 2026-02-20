/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import AdminPage from '@/app/admin/page';
import { auth0 } from '@/lib/auth0';
import { getSystemAdministratorAccessByEmail } from '@/lib/system-administrators';

jest.mock('@/lib/auth0', () => ({
  auth0: { getSession: jest.fn() },
}));

jest.mock('@/lib/system-administrators', () => ({
  getSystemAdministratorAccessByEmail: jest.fn(),
}));

jest.mock('@/features/admin/AdminFeature', () => ({
  __esModule: true,
  default: () => <div>AdminFeatureMock</div>,
}));

describe('/admin page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders unauthorized when no login session', async () => {
    (auth0.getSession as jest.Mock).mockResolvedValue(null);

    const jsx = await AdminPage();
    render(jsx);

    expect(screen.getByText('Unauthorized')).toBeInTheDocument();
  });

  it('renders forbidden when user is not admin', async () => {
    (auth0.getSession as jest.Mock).mockResolvedValue({
      user: { email: 'u@example.com' },
    });
    (getSystemAdministratorAccessByEmail as jest.Mock).mockResolvedValue({
      hasAccess: false,
    });

    const jsx = await AdminPage();
    render(jsx);

    expect(screen.getByText('Forbidden')).toBeInTheDocument();
  });

  it('renders admin feature when user has admin access', async () => {
    (auth0.getSession as jest.Mock).mockResolvedValue({
      user: { email: 'admin@example.com' },
    });
    (getSystemAdministratorAccessByEmail as jest.Mock).mockResolvedValue({
      hasAccess: true,
    });

    const jsx = await AdminPage();
    render(jsx);

    expect(screen.getByText('AdminFeatureMock')).toBeInTheDocument();
  });
});
