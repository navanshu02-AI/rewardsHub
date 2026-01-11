import React, { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

type Redemption = {
  id: string;
  user_id: string;
  reward_id: string;
  points_used: number;
  status: string;
  redeemed_at: string;
  tracking_number?: string | null;
  delivered_at?: string | null;
  fulfillment_code?: string | null;
  fulfilled_at?: string | null;
};

type RedemptionDraft = {
  status: string;
  tracking_number: string;
  delivered_at: string;
  fulfillment_code: string;
};

const STATUS_OPTIONS = [
  'all',
  'pending_fulfillment',
  'pending_code',
  'shipped',
  'delivered',
  'fulfilled',
  'cancelled',
  'failed'
];

const statusStyles: Record<string, string> = {
  pending_fulfillment: 'bg-amber-100 text-amber-700',
  pending_code: 'bg-amber-100 text-amber-700',
  shipped: 'bg-blue-100 text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  fulfilled: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
  failed: 'bg-rose-100 text-rose-700'
};

const AllRedemptionsPage: React.FC = () => {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RedemptionDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canAccess = user?.role === 'hr_admin' || user?.role === 'executive';

  const loadRedemptions = async (status: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Redemption[]>('/admin/redemptions', {
        params: status !== 'all' ? { status } : undefined
      });
      setRedemptions(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to load redemptions right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) {
      return;
    }
    void loadRedemptions(statusFilter);
  }, [statusFilter, canAccess]);

  const draftFor = useMemo(() => {
    return redemptions.reduce<Record<string, RedemptionDraft>>((acc, redemption) => {
      acc[redemption.id] = drafts[redemption.id] || {
        status: redemption.status,
        tracking_number: redemption.tracking_number ?? '',
        delivered_at: redemption.delivered_at ? redemption.delivered_at.slice(0, 10) : '',
        fulfillment_code: redemption.fulfillment_code ?? ''
      };
      return acc;
    }, {});
  }, [drafts, redemptions]);

  const updateDraft = (id: string, updates: Partial<RedemptionDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...draftFor[id],
        ...updates
      }
    }));
  };

  const handleSave = async (redemption: Redemption) => {
    const draft = draftFor[redemption.id];
    if (!draft) {
      return;
    }
    const payload: Record<string, any> = {};
    if (draft.status !== redemption.status) {
      payload.status = draft.status;
    }
    if (draft.tracking_number !== (redemption.tracking_number ?? '')) {
      payload.tracking_number = draft.tracking_number || null;
    }
    if (draft.fulfillment_code !== (redemption.fulfillment_code ?? '')) {
      payload.fulfillment_code = draft.fulfillment_code || null;
    }
    if (draft.delivered_at !== (redemption.delivered_at ? redemption.delivered_at.slice(0, 10) : '')) {
      payload.delivered_at = draft.delivered_at ? new Date(draft.delivered_at).toISOString() : null;
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    setSavingId(redemption.id);
    setError(null);
    try {
      await api.patch(`/admin/redemptions/${redemption.id}`, payload);
      await loadRedemptions(statusFilter);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[redemption.id];
        return next;
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to update redemption.');
    } finally {
      setSavingId(null);
    }
  };

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-slate-900">All Redemptions</h1>
        <p className="mt-3 text-sm text-slate-600">You do not have access to the redemptions admin page.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">All Redemptions</h1>
            <p className="text-sm text-slate-600">Manage reward fulfillment across the organization.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-slate-700" htmlFor="redemption-status-filter">
              Status
            </label>
            <select
              id="redemption-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-10 text-sm text-slate-500">Loading redemptions...</div>
        ) : redemptions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No redemptions found for this status.
          </div>
        ) : (
          <div className="space-y-4">
            {redemptions.map((redemption) => {
              const draft = draftFor[redemption.id];
              const statusClass = statusStyles[draft.status] || 'bg-slate-100 text-slate-600';

              return (
                <div key={redemption.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span className={`rounded-full px-2 py-1 ${statusClass}`}>{draft.status}</span>
                        <span>Redeemed {new Date(redemption.redeemed_at).toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-slate-700">
                        <span className="font-medium text-slate-900">User:</span> {redemption.user_id}
                      </div>
                      <div className="text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Reward:</span> {redemption.reward_id}
                      </div>
                      <div className="text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Points:</span> {redemption.points_used}
                      </div>
                      {redemption.fulfilled_at && (
                        <div className="text-xs text-slate-500">
                          Fulfilled {new Date(redemption.fulfilled_at).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="grid w-full gap-3 sm:max-w-xl sm:grid-cols-2">
                      <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                        <select
                          value={draft.status}
                          onChange={(event) => updateDraft(redemption.id, { status: event.target.value })}
                          className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700 shadow-sm focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        >
                          {STATUS_OPTIONS.filter((option) => option !== 'all').map((option) => (
                            <option key={option} value={option}>
                              {option.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tracking #
                        <input
                          type="text"
                          value={draft.tracking_number}
                          onChange={(event) => updateDraft(redemption.id, { tracking_number: event.target.value })}
                          className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700 shadow-sm focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          placeholder="Tracking number"
                        />
                      </label>
                      <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Delivered at
                        <input
                          type="date"
                          value={draft.delivered_at}
                          onChange={(event) => updateDraft(redemption.id, { delivered_at: event.target.value })}
                          className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700 shadow-sm focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                      <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Fulfillment code
                        <input
                          type="text"
                          value={draft.fulfillment_code}
                          onChange={(event) => updateDraft(redemption.id, { fulfillment_code: event.target.value })}
                          className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700 shadow-sm focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          placeholder="Gift card code"
                        />
                      </label>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handleSave(redemption)}
                      disabled={savingId === redemption.id}
                      className="rounded-full border border-blue-200 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingId === redemption.id ? 'Saving...' : 'Save updates'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllRedemptionsPage;
