import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | undefined>();
  const navigate = useNavigate();
  const { requestPasswordReset } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const result = await requestPasswordReset(email);
    setLoading(false);

    if (result.success) {
      setMessage(result.message || 'If that email exists, we have sent reset instructions.');
      setResetToken(result.resetToken || '');
      setExpiresAt(result.expiresAt);
    } else {
      setError(result.error || 'Unable to send reset email. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Forgot your password?</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your account email and we&apos;ll send a reset link. For local testing, a token is returned here.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">{error}</div>}
          {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">{message}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-md text-white bg-blue-600 hover:bg-blue-700 font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Sending reset link...' : 'Send reset link'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/auth')}
            className="w-full py-2 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back to sign in
          </button>
        </form>

        {resetToken && (
          <div className="bg-white p-4 rounded-lg shadow space-y-3 border border-blue-100">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Local reset token (dev use)</p>
              {expiresAt && <span className="text-xs text-gray-500">Expires at: {new Date(expiresAt).toLocaleString()}</span>}
            </div>
            <code className="block bg-gray-50 text-gray-800 text-sm px-3 py-2 rounded break-words">{resetToken}</code>
            <button
              type="button"
              onClick={() => navigate(`/reset-password?token=${encodeURIComponent(resetToken)}`)}
              className="w-full py-2 px-4 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 font-medium transition-colors"
            >
              Reset password now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
