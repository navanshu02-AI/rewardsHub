import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AcceptInvitePage from '../AcceptInvitePage';
import * as AuthContext from '../../../contexts/AuthContext';

jest.mock('../../../contexts/AuthContext', () => {
  const actual = jest.requireActual('../../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: jest.fn(),
  };
});

const mockedUseAuth = AuthContext.useAuth as jest.MockedFunction<typeof AuthContext.useAuth>;

afterEach(() => {
  jest.clearAllMocks();
});

test('accepts invite and sets password', async () => {
  const resetPassword = jest.fn().mockResolvedValue({ success: true, message: 'Password set' });

  mockedUseAuth.mockReturnValue({
    user: null,
    login: jest.fn(),
    register: jest.fn(),
    setAuthSession: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword,
    logout: jest.fn(),
    updateUserPreferences: jest.fn(),
    loading: false,
    isAuthenticated: false,
    refreshUser: jest.fn(),
    region: 'IN',
    currency: 'INR',
    setRegionCurrency: jest.fn(),
    formatCurrency: jest.fn(),
  });

  const user = userEvent.setup();

  render(
    <MemoryRouter initialEntries={['/accept-invite?token=invite-token&email=invitee%40example.com']}>
      <AcceptInvitePage />
    </MemoryRouter>
  );

  expect(screen.getByText(/invitee@example.com/i)).toBeInTheDocument();

  await user.type(screen.getByLabelText(/new password/i), 'Welcome123!');
  await user.type(screen.getByLabelText(/confirm new password/i), 'Welcome123!');
  await user.click(screen.getByRole('button', { name: /set password/i }));

  await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('invite-token', 'Welcome123!'));
});
