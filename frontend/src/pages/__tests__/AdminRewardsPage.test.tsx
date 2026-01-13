import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminRewardsPage from '../AdminRewardsPage';
import api from '../../lib/api';
import * as AuthContext from '../../contexts/AuthContext';

jest.mock('../../lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

jest.mock('../../contexts/AuthContext', () => {
  const actual = jest.requireActual('../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: jest.fn(),
  };
});

const mockedApi = api as jest.Mocked<typeof api>;
const mockedUseAuth = AuthContext.useAuth as jest.MockedFunction<typeof AuthContext.useAuth>;

const mockAdminUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  first_name: 'Admin',
  last_name: 'User',
  role: 'hr_admin' as const,
  points_balance: 0,
  total_points_earned: 0,
  recognition_count: 0,
  preferences: {},
  created_at: new Date().toISOString(),
  is_active: true,
};

const originalEnv = process.env.REACT_APP_ENV;

beforeEach(() => {
  mockedUseAuth.mockReturnValue({
    user: mockAdminUser,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    updateUserPreferences: jest.fn(),
    loading: false,
    isAuthenticated: true,
    refreshUser: jest.fn(),
    region: 'india',
    currency: 'INR',
    setRegionCurrency: jest.fn(),
    formatCurrency: jest.fn(),
  });
});

afterEach(() => {
  process.env.REACT_APP_ENV = originalEnv;
  jest.clearAllMocks();
});

test('loads rewards on mount', async () => {
  mockedApi.get.mockResolvedValue({ data: [] });

  render(<AdminRewardsPage />);

  await waitFor(() =>
    expect(mockedApi.get).toHaveBeenCalledWith('/rewards', { params: { limit: 100, region: 'india' } })
  );
});

test('surfaces validation errors from the API', async () => {
  process.env.REACT_APP_ENV = 'test';
  mockedApi.get.mockResolvedValue({ data: [] });
  mockedApi.post.mockRejectedValue({
    response: {
      data: {
        detail: [
          { loc: ['body', 'points_required'], msg: 'Points required.' },
          { loc: ['body', 'prices', 'INR'], msg: 'Invalid price.' },
        ],
      },
    },
  });

  const user = userEvent.setup();

  render(<AdminRewardsPage />);

  await waitFor(() => expect(mockedApi.get).toHaveBeenCalled());

  await user.click(screen.getByTestId('create-reward-button'));

  const dialog = screen.getByRole('dialog', { name: /create reward/i });
  await user.type(within(dialog).getByLabelText(/title/i), 'Spot Bonus');
  await user.type(within(dialog).getByLabelText(/description/i), 'Quarterly bonus');
  await user.type(within(dialog).getByLabelText(/points required/i), '100');
  await user.type(within(dialog).getByLabelText(/availability/i), '10');
  await user.type(within(dialog).getByLabelText(/price \(inr\)/i), '10');
  await user.type(within(dialog).getByLabelText(/price \(usd\)/i), '1');
  await user.type(within(dialog).getByLabelText(/price \(eur\)/i), '1');

  await user.click(within(dialog).getByRole('button', { name: /save reward/i }));

  expect(await screen.findByText(/body\.points_required: points required\./i)).toBeVisible();
  expect(screen.getByText(/body\.prices\.inr: invalid price\./i)).toBeVisible();
});

test('hides seed button in production', async () => {
  process.env.REACT_APP_ENV = 'production';
  mockedApi.get.mockResolvedValue({ data: [] });

  render(<AdminRewardsPage />);

  await waitFor(() => expect(mockedApi.get).toHaveBeenCalled());

  expect(screen.queryByTestId('seed-rewards-button')).not.toBeInTheDocument();
});
