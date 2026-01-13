import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import * as AuthContext from '../../../contexts/AuthContext';
import * as SettingsContext from '../../../contexts/SettingsContext';
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
jest.mock('../../../contexts/SettingsContext', () => {
  const actual = jest.requireActual('../../../contexts/SettingsContext');
  return {
    ...actual,
    useSettings: jest.fn(),
  };
});

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedUseAuth = AuthContext.useAuth as jest.MockedFunction<typeof AuthContext.useAuth>;
const mockedUseSettings = SettingsContext.useSettings as jest.MockedFunction<
  typeof SettingsContext.useSettings
>;

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

test('loads recipients and defaults to the first option', async () => {
  const authValue = createAuthContextValue('employee');
  mockedUseAuth.mockReturnValue(authValue);
  mockedUseSettings.mockReturnValue({ aiEnabled: false, loading: false });

  mockedAxios.get.mockResolvedValue({
    data: {
      recipients: [
        {
          id: 'peer-1',
          first_name: 'Pat',
          last_name: 'Peer',
          role: 'employee',
          department: 'Engineering',
        },
      ],
    },
  });

  mockedAxios.post.mockImplementation((url) => {
    if (url === '/recognitions/eligibility') {
      return Promise.resolve({
        data: [{ user_id: 'peer-1', points_eligible: true, reason: 'standard_points' }],
      });
    }
    return Promise.resolve({ data: {} });
  });

  render(
    <RecognitionModal
      isOpen
      onClose={jest.fn()}
      onSuccess={jest.fn()}
    />
  );

  await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());

  expect(screen.queryByRole('button', { name: /Peers/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Direct reports/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Company-wide/i })).not.toBeInTheDocument();

  const recipientSelect = screen.getByLabelText('Choose recipients') as HTMLSelectElement;
  expect(recipientSelect.selectedOptions).toHaveLength(1);
  expect(recipientSelect.selectedOptions[0].value).toBe('peer-1');
  expect(screen.getByRole('option', { name: /Pat Peer/ })).toBeInTheDocument();
});

test('surfaces backend validation errors during submission', async () => {
  const authValue = createAuthContextValue('hr_admin');
  mockedUseAuth.mockReturnValue(authValue);
  mockedUseSettings.mockReturnValue({ aiEnabled: false, loading: false });

  mockedAxios.get.mockResolvedValue({
    data: {
      recipients: [
        {
          id: 'global-1',
          first_name: 'Riley',
          last_name: 'Recipient',
          role: 'employee',
        },
      ],
    },
  });

  mockedAxios.post.mockImplementation((url) => {
    if (url === '/recognitions/eligibility') {
      return Promise.resolve({
        data: [{ user_id: 'global-1', points_eligible: true, reason: 'role_allows_points' }],
      });
    }
    return Promise.reject({
      response: { data: { detail: 'Only managers and HR leaders can recognize direct reports.' } },
    });
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

  const recipientSelect = screen.getByLabelText('Choose recipients') as HTMLSelectElement;
  expect(recipientSelect.selectedOptions).toHaveLength(1);
  expect(recipientSelect.selectedOptions[0].value).toBe('global-1');

  const messageInput = screen.getByLabelText('Appreciation message');
  await user.type(messageInput, 'Huge thanks for coordinating the rollout.');

  await user.click(screen.getByRole('button', { name: 'Customer focus' }));

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

test('shows recognition-only helper text and keeps group labels non-selectable', async () => {
  const authValue = createAuthContextValue('employee');
  mockedUseAuth.mockReturnValue(authValue);
  mockedUseSettings.mockReturnValue({ aiEnabled: false, loading: false });

  mockedAxios.get.mockResolvedValue({
    data: {
      recipients: [
        {
          id: 'peer-1',
          first_name: 'Pat',
          last_name: 'Peer',
          role: 'employee',
        },
        {
          id: 'peer-2',
          first_name: 'Rory',
          last_name: 'Recognition',
          role: 'employee',
        },
      ],
    },
  });

  mockedAxios.post.mockImplementation((url, payload) => {
    if (url === '/recognitions/eligibility') {
      const ids = (payload as { to_user_ids: string[] }).to_user_ids;
      return Promise.resolve({
        data: ids.map((id) => ({
          user_id: id,
          points_eligible: id === 'peer-1',
          reason: id === 'peer-1' ? 'standard_points' : 'outside_reporting_line',
        })),
      });
    }
    return Promise.resolve({ data: {} });
  });

  const user = userEvent.setup();

  render(
    <RecognitionModal
      isOpen
      onClose={jest.fn()}
      onSuccess={jest.fn()}
    />
  );

  await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());

  await user.selectOptions(screen.getByTestId('recognition-recipient'), ['peer-2']);

  expect(screen.getByText('Recognition only (no points)')).toBeInTheDocument();
});

test('submits multiple recipients using to_user_ids', async () => {
  const authValue = createAuthContextValue('hr_admin');
  mockedUseAuth.mockReturnValue(authValue);
  mockedUseSettings.mockReturnValue({ aiEnabled: false, loading: false });

  mockedAxios.get.mockResolvedValue({
    data: {
      recipients: [
        {
          id: 'global-1',
          first_name: 'Riley',
          last_name: 'Recipient',
          role: 'employee',
        },
        {
          id: 'global-2',
          first_name: 'Jordan',
          last_name: 'Recipient',
          role: 'employee',
        },
      ],
    },
  });

  mockedAxios.post.mockImplementation((url, payload) => {
    if (url === '/recognitions/eligibility') {
      const ids = (payload as { to_user_ids: string[] }).to_user_ids;
      return Promise.resolve({
        data: ids.map((id) => ({
          user_id: id,
          points_eligible: true,
          reason: 'role_allows_points',
        })),
      });
    }
    return Promise.resolve({ data: {} });
  });

  const onSuccess = jest.fn();
  const user = userEvent.setup();

  render(
    <RecognitionModal
      isOpen
      onClose={jest.fn()}
      onSuccess={onSuccess}
    />
  );

  await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());

  await user.selectOptions(screen.getByTestId('recognition-recipient'), ['global-1', 'global-2']);
  await user.type(screen.getByLabelText('Appreciation message'), 'Great collaboration across the launch.');
  await user.click(screen.getByRole('button', { name: 'Customer focus' }));

  await user.click(screen.getByRole('button', { name: /Send recognition/i }));

  await waitFor(() => expect(mockedAxios.post).toHaveBeenCalled());
  expect(mockedAxios.post).toHaveBeenCalledWith(
    '/recognitions',
    expect.objectContaining({
      to_user_ids: ['global-1', 'global-2'],
      is_public: true,
    })
  );
});

test('submits recognition as private when show on feed is unchecked', async () => {
  const authValue = createAuthContextValue('employee');
  mockedUseAuth.mockReturnValue(authValue);
  mockedUseSettings.mockReturnValue({ aiEnabled: false, loading: false });

  mockedAxios.get.mockResolvedValue({
    data: {
      recipients: [
        {
          id: 'peer-1',
          first_name: 'Pat',
          last_name: 'Peer',
          role: 'employee',
        },
      ],
    },
  });

  mockedAxios.post.mockImplementation((url) => {
    if (url === '/recognitions/eligibility') {
      return Promise.resolve({
        data: [{ user_id: 'peer-1', points_eligible: true, reason: 'standard_points' }],
      });
    }
    return Promise.resolve({ data: {} });
  });

  const user = userEvent.setup();

  render(
    <RecognitionModal
      isOpen
      onClose={jest.fn()}
      onSuccess={jest.fn()}
    />
  );

  await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());

  await user.type(screen.getByLabelText('Appreciation message'), 'Thanks for helping with the deployment.');
  await user.click(screen.getByRole('button', { name: 'Customer focus' }));
  await user.click(screen.getByTestId('recognition-public-toggle'));

  await user.click(screen.getByRole('button', { name: /Send recognition/i }));

  await waitFor(() => expect(mockedAxios.post).toHaveBeenCalled());
  expect(mockedAxios.post).toHaveBeenCalledWith(
    '/recognitions',
    expect.objectContaining({
      is_public: false,
    })
  );
});
