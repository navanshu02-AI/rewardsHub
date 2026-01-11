import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

type UserSummary = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
};

type PendingRecognition = {
  id: string;
  message: string;
  points_awarded: number;
  status: string;
  created_at: string;
  from_user_snapshot?: UserSummary;
  to_user_snapshots?: UserSummary[];
};

const ApprovalsPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<PendingRecognition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadPending = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<PendingRecognition[]>('/recognitions/pending');
      setItems(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to load approvals right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPending();
  }, []);

  const handleDecision = async (recognitionId: string, action: 'approve' | 'reject') => {
    setActionId(recognitionId);
    try {
      await api.post(`/recognitions/${recognitionId}/${action}`);
      await loadPending();
    } catch (err: any) {
      setError(err.response?.data?.detail || `Unable to ${action} recognition.`);
    } finally {
      setActionId(null);
    }
  };

  if (user?.role !== 'hr_admin') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-slate-900">Approvals</h1>
        <p className="mt-3 text-sm text-slate-600">You do not have access to HR approvals.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Approvals</h1>
          <p className="text-sm text-slate-600">Review pending recognition awards before they are applied.</p>
        </div>
        <button
          onClick={() => loadPending()}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 text-sm text-slate-500">Loading pending recognitions...</div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No recognitions are waiting for approval.
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {items.map((item) => {
            const from = item.from_user_snapshot;
            const toNames = (item.to_user_snapshots || []).map((recipient) => `${recipient.first_name} ${recipient.last_name}`);
            return (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending</div>
                    <h2 className="text-lg font-semibold text-slate-900">{item.message}</h2>
                    <div className="text-sm text-slate-600">
                      <span className="font-medium text-slate-700">From:</span>{' '}
                      {from ? `${from.first_name} ${from.last_name}` : 'Unknown'}
                    </div>
                    <div className="text-sm text-slate-600">
                      <span className="font-medium text-slate-700">To:</span>{' '}
                      {toNames.length ? toNames.join(', ') : 'Unknown'}
                    </div>
                    <div className="text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Points:</span> {item.points_awarded}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDecision(item.id, 'reject')}
                      disabled={actionId === item.id}
                      className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleDecision(item.id, 'approve')}
                      disabled={actionId === item.id}
                      className="rounded-full border border-emerald-200 bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApprovalsPage;
