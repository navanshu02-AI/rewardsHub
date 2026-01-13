import React, { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { useAuth, type UserRole } from '../contexts/AuthContext';

type RewardRecord = {
  id: string;
  title: string;
  description: string;
  category: string;
  reward_type: string;
  provider: string;
  points_required: number;
  prices: Record<string, number>;
  availability: number;
  is_popular: boolean;
  is_active: boolean;
};

type RewardForm = {
  title: string;
  description: string;
  category: string;
  reward_type: string;
  provider: string;
  points_required: string;
  price_inr: string;
  price_usd: string;
  price_eur: string;
  availability: string;
  is_popular: boolean;
  is_active: boolean;
};

const ADMIN_ROLES: UserRole[] = ['hr_admin', 'executive', 'c_level'];

const CATEGORY_OPTIONS = [
  'electronics',
  'fashion',
  'books',
  'food',
  'travel',
  'fitness',
  'home',
  'entertainment',
  'education',
  'gift_cards',
  'jewelry',
  'health_wellness',
  'automotive',
  'sports',
  'beauty_personal_care'
];

const REWARD_TYPE_OPTIONS = [
  'physical_product',
  'digital_product',
  'experience',
  'gift_card',
  'recognition',
  'voucher',
  'cash_reward'
];

const PROVIDER_OPTIONS = ['internal', 'amazon_giftcard', 'manual_vendor'];

const toTitleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const parseNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatErrorMessages = (detail: unknown) => {
  if (Array.isArray(detail)) {
    return detail.map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      if (item && typeof item === 'object') {
        const record = item as { loc?: Array<string | number>; msg?: string };
        const location = record.loc?.filter((part) => typeof part === 'string').join('.') ?? '';
        if (record.msg) {
          return location ? `${location}: ${record.msg}` : record.msg;
        }
      }
      return 'Validation error.';
    });
  }
  if (typeof detail === 'string') {
    return [detail];
  }
  return ['Unable to save reward.'];
};

const defaultFormState: RewardForm = {
  title: '',
  description: '',
  category: 'electronics',
  reward_type: 'physical_product',
  provider: 'internal',
  points_required: '',
  price_inr: '',
  price_usd: '',
  price_eur: '',
  availability: '0',
  is_popular: false,
  is_active: true
};

const AdminRewardsPage: React.FC = () => {
  const { user, region } = useAuth();
  const [rewards, setRewards] = useState<RewardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionErrors, setActionErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<RewardRecord | null>(null);
  const [formState, setFormState] = useState<RewardForm>(defaultFormState);

  const canAccess = user?.role ? ADMIN_ROLES.includes(user.role) : false;
  const isProduction = process.env.REACT_APP_ENV === 'production';

  const rewardRows = useMemo(() => {
    return rewards.map((reward) => ({
      ...reward,
      categoryLabel: toTitleCase(reward.category),
      rewardTypeLabel: toTitleCase(reward.reward_type),
      providerLabel: toTitleCase(reward.provider)
    }));
  }, [rewards]);

  const loadRewards = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<RewardRecord[]>('/rewards', { params: { limit: 100, region } });
      setRewards(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to load rewards right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) {
      return;
    }
    void loadRewards();
  }, [canAccess]);

  const openCreateModal = () => {
    setFormState(defaultFormState);
    setSelectedReward(null);
    setActionErrors([]);
    setIsCreateOpen(true);
  };

  const openEditModal = (reward: RewardRecord) => {
    setSelectedReward(reward);
    setFormState({
      title: reward.title,
      description: reward.description,
      category: reward.category,
      reward_type: reward.reward_type,
      provider: reward.provider,
      points_required: String(reward.points_required ?? ''),
      price_inr: String(reward.prices?.INR ?? ''),
      price_usd: String(reward.prices?.USD ?? ''),
      price_eur: String(reward.prices?.EUR ?? ''),
      availability: String(reward.availability ?? 0),
      is_popular: reward.is_popular,
      is_active: reward.is_active
    });
    setActionErrors([]);
    setIsEditOpen(true);
  };

  const updateFormField = (field: keyof RewardForm, value: string | boolean) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setActionErrors([]);
    try {
      const payload = {
        title: formState.title,
        description: formState.description,
        category: formState.category,
        reward_type: formState.reward_type,
        provider: formState.provider,
        points_required: parseNumber(formState.points_required),
        prices: {
          INR: parseNumber(formState.price_inr),
          USD: parseNumber(formState.price_usd),
          EUR: parseNumber(formState.price_eur)
        },
        availability: parseNumber(formState.availability),
        is_popular: formState.is_popular,
        is_active: formState.is_active
      };
      await api.post('/rewards', payload);
      setIsCreateOpen(false);
      await loadRewards();
    } catch (err: any) {
      setActionErrors(formatErrorMessages(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedReward) {
      return;
    }
    setSaving(true);
    setActionErrors([]);
    try {
      const payload = {
        title: formState.title,
        description: formState.description,
        points_required: parseNumber(formState.points_required),
        prices: {
          INR: parseNumber(formState.price_inr),
          USD: parseNumber(formState.price_usd),
          EUR: parseNumber(formState.price_eur)
        },
        availability: parseNumber(formState.availability),
        is_popular: formState.is_popular,
        is_active: formState.is_active,
        provider: formState.provider
      };
      await api.put(`/rewards/${selectedReward.id}`, payload);
      setIsEditOpen(false);
      setSelectedReward(null);
      await loadRewards();
    } catch (err: any) {
      setActionErrors(formatErrorMessages(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const handleSeedRewards = async () => {
    setSaving(true);
    setActionErrors([]);
    try {
      await api.post('/rewards/seed');
      await loadRewards();
    } catch (err: any) {
      setActionErrors(formatErrorMessages(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Rewards</h1>
        <p className="mt-3 text-sm text-slate-600">You do not have access to reward administration.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Admin Rewards</h1>
            <p className="text-sm text-slate-600">Create and manage reward catalog entries.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!isProduction && (
              <button
                onClick={handleSeedRewards}
                disabled={saving}
                data-testid="seed-rewards-button"
                className="rounded-full border border-emerald-500 bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Seed sample rewards
              </button>
            )}
            <button
              onClick={() => loadRewards()}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
            >
              Refresh
            </button>
            <button
              onClick={openCreateModal}
              data-testid="create-reward-button"
              className="rounded-full border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500"
            >
              Create reward
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {actionErrors.length > 0 && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <p className="font-medium">We could not save your changes.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {actionErrors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <div className="col-span-4">Reward</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Points</div>
            <div className="col-span-2">Availability</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1 text-right">Action</div>
          </div>
          {loading ? (
            <div className="px-4 py-6 text-sm text-slate-500">Loading rewards…</div>
          ) : rewardRows.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">No rewards found yet.</div>
          ) : (
            rewardRows.map((reward) => (
              <div
                key={reward.id}
                className="grid grid-cols-12 items-center gap-y-2 border-t border-slate-200 px-4 py-3 text-sm"
              >
                <div className="col-span-4">
                  <p className="font-medium text-slate-900">{reward.title}</p>
                  <p className="text-xs text-slate-500">
                    {reward.rewardTypeLabel} · {reward.providerLabel}
                  </p>
                </div>
                <div className="col-span-2 text-slate-600">{reward.categoryLabel}</div>
                <div className="col-span-2 text-slate-600">{reward.points_required}</div>
                <div className="col-span-2 text-slate-600">{reward.availability}</div>
                <div className="col-span-1">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      reward.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {reward.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="col-span-1 text-right">
                  <button
                    onClick={() => openEditModal(reward)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {(isCreateOpen || isEditOpen) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-label={isCreateOpen ? 'Create reward' : 'Edit reward'}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {isCreateOpen ? 'Create reward' : 'Edit reward'}
                </h2>
                <p className="text-sm text-slate-600">
                  {isCreateOpen
                    ? 'Add a new reward to the catalog.'
                    : 'Update reward details and availability.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setIsEditOpen(false);
                  setSelectedReward(null);
                }}
                className="text-slate-400 transition hover:text-slate-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={isCreateOpen ? handleCreateSubmit : handleEditSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Title
                  <input
                    type="text"
                    required
                    value={formState.title}
                    onChange={(event) => updateFormField('title', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Category
                  <select
                    value={formState.category}
                    onChange={(event) => updateFormField('category', event.target.value)}
                    disabled={isEditOpen}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {toTitleCase(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  Description
                  <textarea
                    required
                    value={formState.description}
                    onChange={(event) => updateFormField('description', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    rows={3}
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Reward type
                  <select
                    value={formState.reward_type}
                    onChange={(event) => updateFormField('reward_type', event.target.value)}
                    disabled={isEditOpen}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                  >
                    {REWARD_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {toTitleCase(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Provider
                  <select
                    value={formState.provider}
                    onChange={(event) => updateFormField('provider', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {PROVIDER_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {toTitleCase(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Points required
                  <input
                    type="number"
                    min={0}
                    required
                    value={formState.points_required}
                    onChange={(event) => updateFormField('points_required', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Availability
                  <input
                    type="number"
                    min={0}
                    required
                    value={formState.availability}
                    onChange={(event) => updateFormField('availability', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-medium text-slate-700">
                  Price (INR)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={formState.price_inr}
                    onChange={(event) => updateFormField('price_inr', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Price (USD)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={formState.price_usd}
                    onChange={(event) => updateFormField('price_usd', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Price (EUR)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={formState.price_eur}
                    onChange={(event) => updateFormField('price_eur', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={formState.is_popular}
                    onChange={(event) => updateFormField('is_popular', event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  Popular reward
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={formState.is_active}
                    onChange={(event) => updateFormField('is_active', event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  Active
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setIsEditOpen(false);
                    setSelectedReward(null);
                  }}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? 'Saving…' : 'Save reward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRewardsPage;
