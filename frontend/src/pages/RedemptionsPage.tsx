import React, { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

interface RewardSummary {
  id: string;
  title: string;
  reward_type: string;
  provider?: string;
}

interface Redemption {
  id: string;
  reward_id: string;
  points_used: number;
  status: string;
  redeemed_at: string;
  fulfillment_code?: string | null;
  fulfilled_at?: string | null;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  pending_fulfillment: 'bg-amber-100 text-amber-700',
  pending_code: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  fulfilled: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
  failed: 'bg-rose-100 text-rose-700'
};

const RedemptionsPage: React.FC = () => {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [rewards, setRewards] = useState<RewardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rewardTitleMap = useMemo(() => {
    return rewards.reduce((map, reward) => {
      map.set(reward.id, reward.title);
      return map;
    }, new Map<string, string>());
  }, [rewards]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [redemptionsResponse, rewardsResponse] = await Promise.all([
          api.get<Redemption[]>('/rewards/redemptions/me'),
          api.get<RewardSummary[]>('/rewards', { params: { limit: 100 } })
        ]);
        setRedemptions(redemptionsResponse.data);
        setRewards(rewardsResponse.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Unable to load redemptions right now.');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  const renderEmptyState = () => {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
        <p>No rewards have been redeemed yet. Redeem a reward to see it listed here.</p>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">My redemptions</h2>
          <p className="text-sm text-gray-500">Track the rewards you have redeemed and their delivery status.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          </div>
        ) : redemptions.length === 0 ? (
          renderEmptyState()
        ) : (
          <ul className="space-y-4">
            {redemptions.map((redemption) => {
              const rewardTitle = rewardTitleMap.get(redemption.reward_id) || 'Reward unavailable';
              const statusClass = statusStyles[redemption.status] || 'bg-gray-100 text-gray-600';

              return (
                <li key={redemption.id} className="rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{rewardTitle}</span>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide ${statusClass}`}>
                          {redemption.status}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(redemption.redeemed_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">Reward ID: {redemption.reward_id}</p>
                      {redemption.status === 'fulfilled' && redemption.fulfillment_code && (
                        <div className="mt-3 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                          <span className="font-semibold">Gift card code:</span> {redemption.fulfillment_code}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 self-start rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                      </svg>
                      {redemption.points_used} pts
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default RedemptionsPage;
