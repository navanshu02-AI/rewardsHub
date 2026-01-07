import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import * as AuthContext from '../../../contexts/AuthContext';
import RecognitionModal from '../RecognitionModal';

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

const createAuthContextValue = (role: AuthContext.UserRole) => {
  const refreshUser = jest.fn().mockResolvedValue(undefined);
  return {
    user: {
      id: 'current-user',
      email: 'current@example.com',
      first_name: 'Casey',
      last_name: 'Current',
      role,
      points_balance: 0,
      total_points_earned: 0,
      recognition_count: 0,
      preferences: {},
      created_at: new Date().toISOString(),
      is_active: true,
    },
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    updateUserPreferences: jest.fn(),
    loading: false,
    isAuthenticated: true,
    refreshUser,
  };
};

test('disables restricted scopes for employees and defaults to peer recipients', async () => {
  const authValue = createAuthContextValue('employee');
  mockedUseAuth.mockReturnValue(authValue);

  mockedAxios.get.mockResolvedValue({
    data: {
      peer: {
        enabled: true,
        recipients: [
          {
            id: 'peer-1',
            first_name: 'Pat',
            last_name: 'Peer',
            role: 'employee',
            department: 'Engineering',
          },
        ],
        description: 'Peers are colleagues who share your manager.',
      },
      report: {
        enabled: false,
        recipients: [],
        description: 'Only managers can see this scope.',
      },
      global: {
        enabled: false,
        recipients: [],
        description: 'Only HR may send company-wide recognition.',
      },
    },
  });

  render(
    <RecognitionModal
      isOpen
      onClose={jest.fn()}
      onSuccess={jest.fn()}
    />
  );

  await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());

  expect(screen.getByRole('button', { name: /Peers/i })).not.toBeDisabled();
  expect(screen.getByRole('button', { name: /Direct reports/i })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Company-wide/i })).toBeDisabled();

  const recipientSelect = screen.getByLabelText('Choose recipient');
  expect(recipientSelect).toHaveValue('peer-1');
  expect(screen.getByRole('option', { name: /Pat Peer/ })).toBeInTheDocument();
});

test('surfaces backend validation errors during submission', async () => {
  const authValue = createAuthContextValue('hr_admin');
  mockedUseAuth.mockReturnValue(authValue);

  mockedAxios.get.mockResolvedValue({
    data: {
      peer: { enabled: false, recipients: [] },
      report: { enabled: false, recipients: [] },
      global: {
        enabled: true,
        recipients: [
          {
            id: 'global-1',
            first_name: 'Riley',
            last_name: 'Recipient',
            role: 'employee',
          },
        ],
        description: 'Company leaders can recognise anyone.',
      },
    },
  });

  mockedAxios.post.mockRejectedValue({
    response: { data: { detail: 'Only managers and HR leaders can recognize direct reports.' } },
  });

  const onSuccess = jest.fn();
  const onClose = jest.fn();
  const user = userEvent.setup();

  render(
    <RecognitionModal
      isOpen
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );

  await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());

  const recipientSelect = screen.getByLabelText('Choose recipient');
  expect(recipientSelect).toHaveValue('global-1');

  const messageInput = screen.getByLabelText('Appreciation message');
  await user.type(messageInput, 'Huge thanks for coordinating the rollout.');

  const submitButton = screen.getByRole('button', { name: /Send recognition/i });
  await user.click(submitButton);

  await waitFor(() =>
    expect(
      screen.getByText('Only managers and HR leaders can recognize direct reports.')
    ).toBeInTheDocument()
  );

  expect(onSuccess).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  expect(authValue.refreshUser).not.toHaveBeenCalled();
});
