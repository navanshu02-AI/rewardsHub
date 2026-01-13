import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { REGION_CONFIG, useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import RecommendationsSection from './RecommendationsSection';
import RewardsCatalog from './RewardsCatalog';
import QuickActions from './QuickActions';
import StatsCards from './StatsCards';
import RecognitionModal from '../Recognition/RecognitionModal';
import RedeemRewardModal from '../Rewards/RedeemRewardModal';

interface Reward {
  id: string;
  title: string;
  description: string;
  category: string;
  reward_type: string;
  points_required: number;
  prices: {
    INR: number;
    USD: number;
    EUR: number;
  };
  original_prices?: {
    INR?: number;
    USD?: number;
    EUR?: number;
  };
  image_url?: string;
  brand?: string;
  vendor?: string;
  availability: number;
  delivery_time?: string;
  is_popular: boolean;
  rating?: number;
  review_count: number;
  tags: string[];
}

interface FilterOption {
  value: string;
  label: string;
}

interface Recommendations {
  rewards: Reward[];
  reason: string;
  confidence_score: number;
  personalization_factors: string[];
}

interface AnalyticsOverview {
  recognitions_last_7_days: number;
  recognitions_last_30_days: number;
  top_departments: Array<{
    department: string;
    recognition_count: number;
  }>;
  points_summary: {
    awarded: number;
    redeemed: number;
  };
}

const GETTING_STARTED_DISMISS_KEY = 'getting-started-dismissed';

const Dashboard: React.FC = () => {
  const { user, currency, region } = useAuth();
  const { aiEnabled, loading: settingsLoading } = useSettings();
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minPoints, setMinPoints] = useState('');
  const [maxPoints, setMaxPoints] = useState('');
  const [category, setCategory] = useState('');
  const [rewardType, setRewardType] = useState('');
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [rewardTypes, setRewardTypes] = useState<FilterOption[]>([]);
  const [showRecognitionModal, setShowRecognitionModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const recommendationsRef = useRef<HTMLDivElement | null>(null);
  const [gettingStartedEligible, setGettingStartedEligible] = useState(false);
  const [gettingStartedDismissed, setGettingStartedDismissed] = useState(false);

  useEffect(() => {
    if (!settingsLoading) {
      void fetchDashboardData();
    }
  }, [currency, region, user?.role, aiEnabled, settingsLoading]);

  useEffect(() => {
    setGettingStartedDismissed(localStorage.getItem(GETTING_STARTED_DISMISS_KEY) === 'true');
  }, []);

  useEffect(() => {
    void fetchFilterOptions();
  }, []);

  useEffect(() => {
    if (!loading) {
      void fetchRewards();
    }
  }, [search, minPoints, maxPoints, category, rewardType]);

  const rewardsById = useMemo(() => {
    const map = new Map<string, Reward>();
    rewards.forEach((reward) => map.set(reward.id, reward));
    recommendations?.rewards.forEach((reward) => map.set(reward.id, reward));
    return map;
  }, [rewards, recommendations]);

  const fetchFilterOptions = async () => {
    try {
      const [categoriesRes, rewardTypesRes] = await Promise.all([
        api.get('/preferences/categories'),
        api.get('/preferences/reward-types')
      ]);
      setCategories(categoriesRes.data || []);
      setRewardTypes(rewardTypesRes.data || []);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const recommendationsPromise = aiEnabled
        ? api.get('/recommendations', { params: { region } })
        : Promise.resolve(null);
      const analyticsPromise =
        user?.role === 'hr_admin' ? api.get('/admin/analytics/overview') : Promise.resolve(null);
      const usersPromise = user?.role === 'hr_admin' ? api.get('/users') : Promise.resolve(null);
      const rewardsSummaryPromise =
        user?.role === 'hr_admin' ? api.get('/rewards', { params: { currency, region } }) : Promise.resolve(null);

      const [recommendationsRes, analyticsRes, usersRes, rewardsSummaryRes] = await Promise.all([
        recommendationsPromise,
        analyticsPromise,
        usersPromise,
        rewardsSummaryPromise
      ]);

      if (recommendationsRes) {
        setRecommendations(recommendationsRes.data);
      } else {
        setRecommendations(null);
      }
      setAnalytics(analyticsRes ? analyticsRes.data : null);
      if (user?.role === 'hr_admin') {
        const userCount = usersRes?.data?.length ?? 0;
        const rewardsCount = rewardsSummaryRes?.data?.length ?? 0;
        setGettingStartedEligible(userCount <= 1 || rewardsCount === 0);
      } else {
        setGettingStartedEligible(false);
      }
      await fetchRewards();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRewards = async () => {
    try {
      const params: Record<string, string | number> = { currency, region };
      const trimmedSearch = search.trim();
      if (trimmedSearch) {
        params.search = trimmedSearch;
      }
      if (category) {
        params.category = category;
      }
      if (rewardType) {
        params.reward_type = rewardType;
      }
      const minValue = Number(minPoints);
      if (minPoints && !Number.isNaN(minValue)) {
        params.min_points = minValue;
      }
      const maxValue = Number(maxPoints);
      if (maxPoints && !Number.isNaN(maxValue)) {
        params.max_points = maxValue;
      }
      const rewardsRes = await api.get('/rewards', { params });
      setRewards(rewardsRes.data);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    }
  };

  const handleRecognitionSuccess = () => {
    setShowRecognitionModal(false);
    void fetchDashboardData();
  };

  const redeemReward = (rewardId: string) => {
    const reward = rewardsById.get(rewardId) || null;
    if (!reward) {
      return;
    }
    setSelectedReward(reward);
    setShowRedeemModal(true);
  };

  const handleRedeemSuccess = (rewardId: string, message?: string) => {
    const updateAvailability = (items: Reward[]) =>
      items.map((reward) =>
        reward.id === rewardId
          ? { ...reward, availability: Math.max(0, reward.availability - 1) }
          : reward
      );

    setRewards((prev) => updateAvailability(prev));
    setRecommendations((prev) =>
      prev ? { ...prev, rewards: updateAvailability(prev.rewards) } : prev
    );

    const suffix = message ? ` ${message}` : '';
    toast.success(`Reward redeemed successfully!${suffix}`);
  };

  const handleRecommendGift = () => {
    if (recommendationsRef.current) {
      recommendationsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDismissGettingStarted = () => {
    localStorage.setItem(GETTING_STARTED_DISMISS_KEY, 'true');
    setGettingStartedDismissed(true);
  };

  const showGettingStarted =
    user?.role === 'hr_admin' && gettingStartedEligible && !gettingStartedDismissed;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <RecognitionModal
        isOpen={showRecognitionModal}
        onClose={() => setShowRecognitionModal(false)}
        onSuccess={handleRecognitionSuccess}
      />
      <RedeemRewardModal
        isOpen={showRedeemModal}
        reward={selectedReward}
        onClose={() => {
          setShowRedeemModal(false);
          setSelectedReward(null);
        }}
        onSuccess={handleRedeemSuccess}
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.first_name}! {REGION_CONFIG[region]?.flag}
        </h1>
        <p className="mt-2 text-gray-600">
          Your personalized rewards and recognition dashboard tailored to your region
        </p>
      </div>

      <QuickActions
        onGiveRecognition={() => setShowRecognitionModal(true)}
        onRecommendGift={handleRecommendGift}
      />

      {showGettingStarted && (
        <section
          className="mt-6 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm"
          data-testid="getting-started-card"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Getting started
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                Set up your rewards program in minutes
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Add your first teammates, build a reward catalog, and send recognition to kick things off.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismissGettingStarted}
              className="self-start text-sm font-medium text-slate-500 hover:text-slate-700"
              data-testid="getting-started-dismiss"
            >
              Dismiss
            </button>
          </div>
          <ul className="mt-6 space-y-3 text-sm text-slate-700">
            <li className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <span className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                Add Users
              </span>
              <Link
                to="/admin/users"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                data-testid="getting-started-add-users"
              >
                Go to Users →
              </Link>
            </li>
            <li className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <span className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                Add Rewards
              </span>
              <Link
                to="/admin/rewards"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                data-testid="getting-started-add-rewards"
              >
                Go to Rewards →
              </Link>
            </li>
            <li className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <span className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                Send Recognition
              </span>
              <button
                type="button"
                onClick={() => setShowRecognitionModal(true)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                data-testid="getting-started-send-recognition"
              >
                Open recognition →
              </button>
            </li>
          </ul>
        </section>
      )}

      <StatsCards user={user} rewardsCount={rewards.length} />

      {user?.role === 'hr_admin' && analytics && (
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">HR dashboard</h2>
              <p className="text-sm text-gray-600">Team recognition and points activity snapshot</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-slate-500">Recognitions (7 days)</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{analytics.recognitions_last_7_days}</p>
              <p className="text-xs text-slate-500 mt-1">Last week</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-slate-500">Recognitions (30 days)</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{analytics.recognitions_last_30_days}</p>
              <p className="text-xs text-slate-500 mt-1">Last month</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-slate-500">Top department</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">
                {analytics.top_departments[0]?.department ?? 'No data'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {analytics.top_departments[0]?.recognition_count ?? 0} recognitions
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-slate-500">Points activity</p>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Awarded</p>
                  <p className="text-lg font-semibold text-slate-900">{analytics.points_summary.awarded}</p>
                </div>
                <div className="h-10 w-px bg-slate-200" aria-hidden />
                <div>
                  <p className="text-xs text-slate-500">Redeemed</p>
                  <p className="text-lg font-semibold text-slate-900">{analytics.points_summary.redeemed}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {aiEnabled && recommendations && (
        <div ref={recommendationsRef}>
          <RecommendationsSection
            recommendations={recommendations}
            onRedeemReward={redeemReward}
            userPoints={user?.points_balance || 0}
          />
        </div>
      )}

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="reward-search">
              Search rewards
            </label>
            <input
              id="reward-search"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, brand, or description"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-1 flex-wrap gap-4">
            <div className="min-w-[180px] flex-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="reward-category">
                Category
              </label>
              <select
                id="reward-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All categories</option>
                {categories.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px] flex-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="reward-type">
                Reward type
              </label>
              <select
                id="reward-type"
                value={rewardType}
                onChange={(event) => setRewardType(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All types</option>
                {rewardTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-1 flex-wrap gap-4">
            <div className="min-w-[140px] flex-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="min-points">
                Min points
              </label>
              <input
                id="min-points"
                type="number"
                min={0}
                value={minPoints}
                onChange={(event) => setMinPoints(event.target.value)}
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="min-w-[140px] flex-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="max-points">
                Max points
              </label>
              <input
                id="max-points"
                type="number"
                min={0}
                value={maxPoints}
                onChange={(event) => setMaxPoints(event.target.value)}
                placeholder="1000"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </section>

      <RewardsCatalog
        rewards={rewards}
        onRedeemReward={redeemReward}
        userPoints={user?.points_balance || 0}
      />
    </div>
  );
};

export default Dashboard;
