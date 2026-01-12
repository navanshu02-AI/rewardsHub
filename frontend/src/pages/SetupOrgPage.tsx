import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface BootstrapFormState {
  org_name: string;
  admin_first_name: string;
  admin_last_name: string;
  admin_email: string;
  admin_password: string;
}

const SetupOrgPage: React.FC = () => {
  const [formState, setFormState] = useState<BootstrapFormState>({
    org_name: '',
    admin_first_name: '',
    admin_last_name: '',
    admin_email: '',
    admin_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setAuthSession } = useAuth();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/orgs/bootstrap', formState);
      const { org_id, token } = response.data;
      setAuthSession(token.access_token, org_id);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to finish setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Set up your organization</h2>
          <p className="mt-2 text-sm text-gray-600">Create your org and admin account to get started.</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <input
                name="org_name"
                type="text"
                required
                value={formState.org_name}
                onChange={handleChange}
                data-testid="setup-org-name"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Organization name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                name="admin_first_name"
                type="text"
                required
                value={formState.admin_first_name}
                onChange={handleChange}
                data-testid="setup-admin-first-name"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Admin first name"
              />
              <input
                name="admin_last_name"
                type="text"
                required
                value={formState.admin_last_name}
                onChange={handleChange}
                data-testid="setup-admin-last-name"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Admin last name"
              />
            </div>
            <div>
              <input
                name="admin_email"
                type="email"
                required
                value={formState.admin_email}
                onChange={handleChange}
                data-testid="setup-admin-email"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Admin email"
              />
            </div>
            <div>
              <input
                name="admin_password"
                type="password"
                required
                minLength={8}
                value={formState.admin_password}
                onChange={handleChange}
                data-testid="setup-admin-password"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Admin password"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              data-testid="setup-submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating organization...
                </div>
              ) : (
                'Create organization'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetupOrgPage;
