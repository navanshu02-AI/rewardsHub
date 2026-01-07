import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import * as AuthContext from '../../../contexts/AuthContext';
import Dashboard from '../../Dashboard/Dashboard';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));
jest.mock('../../../contexts/AuthContext', () => {
  const actual = jest.requireActual('../../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: jest.fn(),
  };
});

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedUseAuth = AuthContext.useAuth as jest.MockedFunction<typeof AuthContext.useAuth>;

afterEach(() => {
  jest.clearAllMocks();
});

const createAuthContextValue = () => {
  const refreshUser = jest.fn().mockResolvedValue(undefined);
  return {
    user: {
      id: 'current-user',
      email: 'current@example.com',
      first_name: 'Casey',
      last_name: 'Current',
      role: 'employee' as AuthContext.UserRole,
      points_balance: 250,
      total_points_earned: 250,
      recognition_count: 0,
      preferences: {},
      created_at: new Date().toISOString(),
      is_active: true,
    },
    login: jest.fn(),
    register: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    logout: jest.fn(),
    updateUserPreferences: jest.fn(),
    loading: false,
    isAuthenticated: true,
    refreshUser,
    region: 'usa' as AuthContext.Region,
    currency: 'USD' as AuthContext.Currency,
    setRegionCurrency: jest.fn(),
    formatCurrency: (amount: number) => `$${amount}`,
  };
};

test('opens redeem modal, submits, shows success, and refreshes user profile', async () => {
  const authValue = createAuthContextValue();
  mockedUseAuth.mockReturnValue(authValue);

  mockedAxios.get
    .mockResolvedValueOnce({
      data: {
        rewards: [
          {
            id: 'reward-1',
            title: 'Coffee Voucher',
            description: 'Fuel the day',
            category: 'food',
            reward_type: 'voucher',
            points_required: 200,
            prices: { USD: 10, INR: 800, EUR: 9 },
            availability: 3,
            is_popular: false,
            review_count: 0,
            tags: [],
          },
        ],
        reason: 'Perfect for you',
        confidence_score: 0.9,
        personalization_factors: ['Coffee'],
      },
    })
    .mockResolvedValueOnce({
      data: [
        {
          id: 'reward-1',
          title: 'Coffee Voucher',
          description: 'Fuel the day',
          category: 'food',
          reward_type: 'voucher',
          points_required: 200,
          prices: { USD: 10, INR: 800, EUR: 9 },
          availability: 3,
          is_popular: false,
          review_count: 0,
          tags: [],
        },
      ],
    });

  mockedAxios.post.mockResolvedValue({ data: { message: 'Enjoy your reward.' } });

  const user = userEvent.setup();
  render(<Dashboard />);

  expect(await screen.findAllByText('Coffee Voucher')).toHaveLength(2);

  const redeemButton = screen.getAllByRole('button', { name: /Redeem Now/i })[0];
  await user.click(redeemButton);

  expect(screen.getByRole('dialog', { name: /Redeem reward/i })).toBeInTheDocument();

  const addressInput = screen.getByLabelText(/Delivery address/i);
  await user.type(addressInput, '123 Test Street');

  const submitButton = screen.getByRole('button', { name: /Confirm redeem/i });
  await user.click(submitButton);

  await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledWith(
    expect.stringContaining('/rewards/redeem'),
    { reward_id: 'reward-1', delivery_address: '123 Test Street' }
  ));

  await waitFor(() => expect(authValue.refreshUser).toHaveBeenCalled());
  expect(await screen.findByRole('status')).toHaveTextContent('Reward redeemed successfully! Enjoy your reward.');
});
