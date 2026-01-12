import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUsersPage from '../AdminUsersPage';
import api from '../../lib/api';
import * as AuthContext from '../../contexts/AuthContext';

jest.mock('../../lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
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

afterEach(() => {
  jest.clearAllMocks();
});

test('loads users on mount', async () => {
  mockedUseAuth.mockReturnValue({
    user: mockAdminUser,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    updateUserPreferences: jest.fn(),
    loading: false,
    isAuthenticated: true,
    refreshUser: jest.fn(),
  });

  mockedApi.get.mockResolvedValue({ data: [] });

  render(<AdminUsersPage />);

  await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/users'));
});

test('provisions a user via the API', async () => {
  mockedUseAuth.mockReturnValue({
    user: mockAdminUser,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    updateUserPreferences: jest.fn(),
    loading: false,
    isAuthenticated: true,
    refreshUser: jest.fn(),
  });

  mockedApi.get.mockResolvedValueOnce({ data: [] });
  mockedApi.post.mockResolvedValue({ data: { id: 'new-user' } });
  mockedApi.get.mockResolvedValueOnce({ data: [] });

  const user = userEvent.setup();

  render(<AdminUsersPage />);

  await waitFor(() => expect(mockedApi.get).toHaveBeenCalled());

  await user.click(screen.getByTestId('provision-user-button'));

  const dialog = screen.getByRole('dialog', { name: /provision user/i });
  await user.type(within(dialog).getByLabelText(/first name/i), 'Casey');
  await user.type(within(dialog).getByLabelText(/last name/i), 'Jones');
  await user.type(within(dialog).getByLabelText(/email address/i), 'casey@example.com');
  await user.type(within(dialog).getByLabelText(/temporary password/i), 'TempPass123!');
  await user.selectOptions(within(dialog).getByLabelText(/role/i), 'manager');

  await user.click(within(dialog).getByRole('button', { name: /provision/i }));

  await waitFor(() =>
    expect(mockedApi.post).toHaveBeenCalledWith('/users/provision', {
      email: 'casey@example.com',
      password: 'TempPass123!',
      first_name: 'Casey',
      last_name: 'Jones',
      role: 'manager',
      manager_id: null,
    })
  );
});

test('updates reporting via the API', async () => {
  mockedUseAuth.mockReturnValue({
    user: mockAdminUser,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    updateUserPreferences: jest.fn(),
    loading: false,
    isAuthenticated: true,
    refreshUser: jest.fn(),
  });

  mockedApi.get.mockResolvedValueOnce({
    data: [
      {
        id: 'user-1',
        first_name: 'Riley',
        last_name: 'Chen',
        email: 'riley@example.com',
        role: 'employee',
        manager_id: null,
      },
    ],
  });
  mockedApi.put.mockResolvedValue({ data: { id: 'user-1' } });
  mockedApi.get.mockResolvedValueOnce({ data: [] });

  const user = userEvent.setup();

  render(<AdminUsersPage />);

  await waitFor(() => expect(mockedApi.get).toHaveBeenCalled());

  await user.click(screen.getByRole('button', { name: /edit reporting/i }));
  await user.selectOptions(screen.getByLabelText(/role/i), 'manager');

  await user.click(screen.getByRole('button', { name: /save changes/i }));

  await waitFor(() =>
    expect(mockedApi.put).toHaveBeenCalledWith('/users/user-1/reporting', {
      role: 'manager',
      manager_id: null,
    })
  );
});

test('deactivates a user via the API', async () => {
  mockedUseAuth.mockReturnValue({
    user: mockAdminUser,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    updateUserPreferences: jest.fn(),
    loading: false,
    isAuthenticated: true,
    refreshUser: jest.fn(),
  });

  mockedApi.get.mockResolvedValueOnce({
    data: [
      {
        id: 'user-2',
        first_name: 'Jamie',
        last_name: 'Lee',
        email: 'jamie@example.com',
        role: 'employee',
        manager_id: null,
        is_active: true,
      },
    ],
  });
  mockedApi.patch.mockResolvedValue({ data: { id: 'user-2' } });
  mockedApi.get.mockResolvedValueOnce({ data: [] });

  const user = userEvent.setup();

  render(<AdminUsersPage />);

  await waitFor(() => expect(mockedApi.get).toHaveBeenCalled());

  await user.click(screen.getByRole('button', { name: /deactivate/i }));
  const dialog = screen.getByRole('dialog', { name: /deactivate user/i });
  await user.click(within(dialog).getByRole('button', { name: /^deactivate$/i }));

  await waitFor(() => expect(mockedApi.patch).toHaveBeenCalledWith('/users/user-2/deactivate'));
});

test('copies invite link for a user', async () => {
  mockedUseAuth.mockReturnValue({
    user: mockAdminUser,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    updateUserPreferences: jest.fn(),
    loading: false,
    isAuthenticated: true,
    refreshUser: jest.fn(),
  });

  mockedApi.get.mockResolvedValueOnce({
    data: [
      {
        id: 'user-3',
        first_name: 'Alex',
        last_name: 'Kim',
        email: 'alex@example.com',
        role: 'employee',
        manager_id: null,
      },
    ],
  });
  mockedApi.post.mockResolvedValueOnce({ data: { invite_url: '/accept-invite?token=abc&email=alex%40example.com' } });

  const clipboardWrite = jest.fn().mockResolvedValue(undefined);
  Object.assign(navigator, {
    clipboard: {
      writeText: clipboardWrite,
    },
  });

  const user = userEvent.setup();

  render(<AdminUsersPage />);

  await waitFor(() => expect(mockedApi.get).toHaveBeenCalled());

  await user.click(screen.getByRole('button', { name: /copy invite link/i }));

  await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/users/user-3/invite'));
  expect(clipboardWrite).toHaveBeenCalledWith('/accept-invite?token=abc&email=alex%40example.com');
  expect(screen.getByText(/invite link copied/i)).toBeInTheDocument();
});
