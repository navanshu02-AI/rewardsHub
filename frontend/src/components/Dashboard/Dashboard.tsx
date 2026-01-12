import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { REGION_CONFIG, useAuth } from '../../contexts/AuthContext';
import RecommendationsSection from './RecommendationsSection';
import RewardsCatalog from './RewardsCatalog';
import QuickActions from './QuickActions';
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

const Dashboard: React.FC = () => {
  const { user, currency, region } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRecognitionModal, setShowRecognitionModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const recommendationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchData();
  }, [currency, user?.role]);

  const rewardsById = useMemo(() => {
    const map = new Map<string, Reward>();
    rewards.forEach((reward) => map.set(reward.id, reward));
    recommendations?.rewards.forEach((reward) => map.set(reward.id, reward));
    return map;
  }, [rewards, recommendations]);

  const fetchData = async () => {
    try {
      const requests = [
        api.get('/recommendations', { params: { currency } }),
        api.get('/rewards', { params: { currency } })
      ];
      if (user?.role === 'hr_admin') {
        requests.push(api.get('/admin/analytics/overview'));
      }
      const [recommendationsRes, rewardsRes, analyticsRes] = await Promise.all(requests);

      setRecommendations(recommendationsRes.data);
      setRewards(rewardsRes.data);
      if (analyticsRes) {
        setAnalytics(analyticsRes.data);
      } else {
        setAnalytics(null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecognitionSuccess = () => {
    setShowRecognitionModal(false);
    void fetchData();
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

      {recommendations && (
        <div ref={recommendationsRef}>
          <RecommendationsSection
            recommendations={recommendations}
            onRedeemReward={redeemReward}
            userPoints={user?.points_balance || 0}
          />
        </div>
      )}

      <RewardsCatalog
        rewards={rewards}
        onRedeemReward={redeemReward}
        userPoints={user?.points_balance || 0}
      />
    </div>
  );
};

export default Dashboard;
