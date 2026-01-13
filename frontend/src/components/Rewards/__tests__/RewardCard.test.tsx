import React from 'react';
import { render, screen } from '@testing-library/react';
import * as AuthContext from '../../../contexts/AuthContext';
import RewardCard from '../RewardCard';

jest.mock('../../../contexts/AuthContext', () => {
  const actual = jest.requireActual('../../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: jest.fn(),
  };
});

const mockedUseAuth = AuthContext.useAuth as jest.MockedFunction<typeof AuthContext.useAuth>;

const baseReward = {
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
};

afterEach(() => {
  jest.clearAllMocks();
});

test('shows currency unavailable message when current currency pricing is missing', () => {
  const formatCurrency = jest.fn((amount: number) => `$${amount}`);
  mockedUseAuth.mockReturnValue({
    currency: 'USD' as AuthContext.Currency,
    formatCurrency,
  } as AuthContext.AuthContextType);

  render(
    <RewardCard
      reward={{
        ...baseReward,
        prices: { USD: 0, INR: 800, EUR: 9 },
      }}
      onRedeemReward={jest.fn()}
      userPoints={300}
    />
  );

  expect(screen.getByText('Not available in your currency')).toBeInTheDocument();
});

test('formats savings and pricing with explicit currency', () => {
  const formatCurrency = jest.fn((amount: number, currency?: AuthContext.Currency) =>
    currency ? `${currency} ${amount}` : `${amount}`
  );
  mockedUseAuth.mockReturnValue({
    currency: 'USD' as AuthContext.Currency,
    formatCurrency,
  } as AuthContext.AuthContextType);

  render(
    <RewardCard
      reward={{
        ...baseReward,
        prices: { USD: 50, INR: 800, EUR: 9 },
        original_prices: { USD: 80 },
      }}
      onRedeemReward={jest.fn()}
      userPoints={300}
    />
  );

  expect(formatCurrency).toHaveBeenCalledWith(80, 'USD');
  expect(formatCurrency).toHaveBeenCalledWith(50, 'USD');
  expect(formatCurrency).toHaveBeenCalledWith(30, 'USD');
});
