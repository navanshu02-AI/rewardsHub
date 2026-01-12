import React, { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { useAuth, type UserRole } from '../contexts/AuthContext';

type UserRecord = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  manager_id?: string | null;
  department?: string | null;
  is_active?: boolean;
};

type ProvisionPayload = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: UserRole;
  manager_id?: string | null;
};

type ReportingPayload = {
  role?: UserRole;
  manager_id?: string | null;
};

type ImportSummary = {
  created: number;
  updated: number;
  failed: number;
  failures?: Array<{
    row: number;
    email?: string | null;
    error: string;
  }>;
};

type InviteResponse = {
  invite_url: string;
};

const ADMIN_ROLES: UserRole[] = ['hr_admin', 'executive', 'c_level'];

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'hr_admin', label: 'HR Admin' },
  { value: 'executive', label: 'Executive' },
  { value: 'c_level', label: 'C-Level' }
];

const toTitleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const AdminUsersPage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<'activate' | 'deactivate'>('deactivate');
  const [saving, setSaving] = useState(false);
  const [inviteLoadingId, setInviteLoadingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [statusTarget, setStatusTarget] = useState<UserRecord | null>(null);
  const [provisionForm, setProvisionForm] = useState<ProvisionPayload>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'employee',
    manager_id: ''
  });
  const [reportingForm, setReportingForm] = useState<ReportingPayload>({
    role: 'employee',
    manager_id: ''
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const canAccess = user?.role ? ADMIN_ROLES.includes(user.role) : false;

  const managerOptions = useMemo(() => {
    return users.map((userItem) => ({
      value: userItem.id,
      label: `${userItem.first_name} ${userItem.last_name}`
    }));
  }, [users]);

  const managerLookup = useMemo(() => {
    return new Map(managerOptions.map((option) => [option.value, option.label]));
  }, [managerOptions]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<UserRecord[]>('/users');
      setUsers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to load users right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) {
      return;
    }
    void loadUsers();
  }, [canAccess]);

  const openProvisionModal = () => {
    setProvisionForm({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'employee',
      manager_id: ''
    });
    setActionError(null);
    setIsProvisionOpen(true);
  };

  const copyInviteLink = async (inviteUrl: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(inviteUrl);
      return;
    }
    const tempInput = document.createElement('textarea');
    tempInput.value = inviteUrl;
    tempInput.style.position = 'fixed';
    tempInput.style.left = '-9999px';
    document.body.appendChild(tempInput);
    tempInput.focus();
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
  };

  const handleCopyInviteLink = async (userItem: UserRecord) => {
    setInviteMessage(null);
    setInviteError(null);
    setInviteLoadingId(userItem.id);
    try {
      const response = await api.post<InviteResponse>(`/users/${userItem.id}/invite`);
      await copyInviteLink(response.data.invite_url);
      setInviteMessage(`Invite link copied for ${userItem.email}.`);
    } catch (err: any) {
      setInviteError(err.response?.data?.detail || 'Unable to create invite link.');
    } finally {
      setInviteLoadingId(null);
    }
  };

  const openEditModal = (userItem: UserRecord) => {
    setSelectedUser(userItem);
    setReportingForm({
      role: userItem.role,
      manager_id: userItem.manager_id ?? ''
    });
    setActionError(null);
    setIsEditOpen(true);
  };

  const openStatusModal = (userItem: UserRecord, action: 'activate' | 'deactivate') => {
    setStatusTarget(userItem);
    setStatusAction(action);
    setActionError(null);
    setIsStatusOpen(true);
  };

  const closeStatusModal = () => {
    setIsStatusOpen(false);
    setStatusTarget(null);
  };

  const handleProvisionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setActionError(null);
    try {
      const payload: ProvisionPayload = {
        ...provisionForm,
        role: provisionForm.role || 'employee',
        manager_id: provisionForm.manager_id || null
      };
      await api.post('/users/provision', payload);
      setIsProvisionOpen(false);
      await loadUsers();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Unable to provision user.');
    } finally {
      setSaving(false);
    }
  };

  const handleReportingSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUser) {
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      const payload: ReportingPayload = {
        role: reportingForm.role || selectedUser.role,
        manager_id: reportingForm.manager_id || null
      };
      await api.put(`/users/${selectedUser.id}/reporting`, payload);
      setIsEditOpen(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Unable to update reporting.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusSubmit = async () => {
    if (!statusTarget) {
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await api.patch(`/users/${statusTarget.id}/${statusAction}`);
      closeStatusModal();
      await loadUsers();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Unable to update user status.');
    } finally {
      setSaving(false);
    }
  };

  const handleImportSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!importFile) {
      setImportError('Please select a CSV file to import.');
      return;
    }
    setImporting(true);
    setImportError(null);
    setImportSummary(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const response = await api.post<ImportSummary>('/users/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportSummary(response.data);
      setImportFile(null);
      await loadUsers();
    } catch (err: any) {
      setImportError(err.response?.data?.detail || 'Unable to import users right now.');
    } finally {
      setImporting(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Users</h1>
        <p className="mt-3 text-sm text-slate-600">You do not have access to user administration.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Admin Users</h1>
            <p className="text-sm text-slate-600">Provision new users and update reporting relationships.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => loadUsers()}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
            >
              Refresh
            </button>
            <button
              onClick={openProvisionModal}
              data-testid="provision-user-button"
              className="rounded-full border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500"
            >
              Provision user
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {inviteMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {inviteMessage}
          </div>
        )}

        {inviteError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {inviteError}
          </div>
        )}

        {loading ? (
          <div className="py-10 text-sm text-slate-500">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No users found yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Manager</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((userItem) => (
                  <tr key={userItem.id} data-testid={`admin-user-row-${userItem.id}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {userItem.first_name} {userItem.last_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{userItem.email}</td>
                    <td className="px-4 py-3 text-slate-600">{toTitleCase(userItem.role)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {userItem.manager_id ? managerLookup.get(userItem.manager_id) || userItem.manager_id : 'Unassigned'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{userItem.is_active === false ? 'Inactive' : 'Active'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openEditModal(userItem)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                        >
                          Edit reporting
                        </button>
                        <button
                          onClick={() =>
                            openStatusModal(userItem, userItem.is_active === false ? 'activate' : 'deactivate')
                          }
                          data-testid={`toggle-user-status-${userItem.id}`}
                          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                        >
                          {userItem.is_active === false ? 'Activate' : 'Deactivate'}
                        </button>
                        <button
                          onClick={() => handleCopyInviteLink(userItem)}
                          disabled={inviteLoadingId === userItem.id}
                          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {inviteLoadingId === userItem.id ? 'Copying...' : 'Copy invite link'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Import CSV</h2>
          <p className="text-sm text-slate-600">
            Upload a CSV with columns: email, first_name, last_name, role, manager_email, department.
          </p>
        </div>
        <form className="mt-4 space-y-4" onSubmit={handleImportSubmit}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="file"
              accept=".csv"
              data-testid="import-csv-input"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setImportFile(nextFile);
              }}
              className="w-full text-sm text-slate-600"
            />
            <button
              type="submit"
              data-testid="import-csv-submit"
              disabled={importing}
              className="rounded-full border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing ? 'Importing...' : 'Import CSV'}
            </button>
          </div>

          {importError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {importError}
            </div>
          )}

          {importSummary && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <p className="font-semibold">
                Created {importSummary.created}, Updated {importSummary.updated}, Failed {importSummary.failed}
              </p>
              {importSummary.failures && importSummary.failures.length > 0 && (
                <ul className="mt-2 list-disc pl-5">
                  {importSummary.failures.map((failure) => (
                    <li key={`${failure.row}-${failure.email ?? 'unknown'}`}>
                      Row {failure.row}: {failure.email ?? 'Unknown email'} - {failure.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </form>
      </div>

      {isProvisionOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Provision user"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsProvisionOpen(false);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Provision user</h2>
                <p className="text-sm text-slate-600">Invite a new teammate and assign their role.</p>
              </div>
              <button
                onClick={() => setIsProvisionOpen(false)}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleProvisionSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  First name
                  <input
                    type="text"
                    required
                    value={provisionForm.first_name}
                    onChange={(event) =>
                      setProvisionForm((prev) => ({ ...prev, first_name: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Last name
                  <input
                    type="text"
                    required
                    value={provisionForm.last_name}
                    onChange={(event) => setProvisionForm((prev) => ({ ...prev, last_name: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  />
                </label>
              </div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email address
                <input
                  type="email"
                  required
                  value={provisionForm.email}
                  onChange={(event) => setProvisionForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Temporary password
                <input
                  type="password"
                  required
                  value={provisionForm.password}
                  onChange={(event) => setProvisionForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Role
                  <select
                    value={provisionForm.role}
                    onChange={(event) =>
                      setProvisionForm((prev) => ({ ...prev, role: event.target.value as UserRole }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Manager
                  <select
                    value={provisionForm.manager_id ?? ''}
                    onChange={(event) =>
                      setProvisionForm((prev) => ({ ...prev, manager_id: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <option value="">Unassigned</option>
                    {managerOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {actionError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {actionError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProvisionOpen(false)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Provision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditOpen && selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Edit reporting"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsEditOpen(false);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Edit reporting</h2>
                <p className="text-sm text-slate-600">
                  Update reporting details for {selectedUser.first_name} {selectedUser.last_name}.
                </p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleReportingSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Role
                  <select
                    value={reportingForm.role ?? selectedUser.role}
                    onChange={(event) =>
                      setReportingForm((prev) => ({ ...prev, role: event.target.value as UserRole }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Manager
                  <select
                    value={reportingForm.manager_id ?? ''}
                    onChange={(event) =>
                      setReportingForm((prev) => ({ ...prev, manager_id: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <option value="">Unassigned</option>
                    {managerOptions
                      .filter((option) => option.value !== selectedUser.id)
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              {actionError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {actionError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStatusOpen && statusTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-label={statusAction === 'deactivate' ? 'Deactivate user' : 'Activate user'}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeStatusModal();
            }
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {statusAction === 'deactivate' ? 'Deactivate user' : 'Activate user'}
                </h2>
                <p className="text-sm text-slate-600">
                  {statusAction === 'deactivate'
                    ? `Deactivate ${statusTarget.first_name} ${statusTarget.last_name}? They will no longer appear as an active teammate.`
                    : `Activate ${statusTarget.first_name} ${statusTarget.last_name} and restore access.`}
                </p>
              </div>
              <button
                onClick={closeStatusModal}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            {actionError && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {actionError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeStatusModal}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusSubmit}
                disabled={saving}
                className="rounded-full border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? statusAction === 'deactivate'
                    ? 'Deactivating...'
                    : 'Activating...'
                  : statusAction === 'deactivate'
                    ? 'Deactivate'
                    : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
