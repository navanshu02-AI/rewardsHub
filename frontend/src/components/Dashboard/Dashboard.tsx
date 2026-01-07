import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { REGION_CONFIG, useAuth } from '../../contexts/AuthContext';
import RecommendationsSection from './RecommendationsSection';
import RewardsCatalog from './RewardsCatalog';
import QuickActions from './QuickActions';
import RecognitionModal from '../Recognition/RecognitionModal';
import RedeemRewardModal from '../Rewards/RedeemRewardModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api/v1`;

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

const Dashboard: React.FC = () => {
  const { user, currency, region } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecognitionModal, setShowRecognitionModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const recommendationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchData();
  }, [currency]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setToastMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const rewardsById = useMemo(() => {
    const map = new Map<string, Reward>();
    rewards.forEach((reward) => map.set(reward.id, reward));
    recommendations?.rewards.forEach((reward) => map.set(reward.id, reward));
    return map;
  }, [rewards, recommendations]);

  const fetchData = async () => {
    try {
      const [recommendationsRes, rewardsRes] = await Promise.all([
        axios.get(`${API}/recommendations`, { params: { currency } }),
        axios.get(`${API}/rewards`, { params: { currency } })
      ]);

      setRecommendations(recommendationsRes.data);
      setRewards(rewardsRes.data);
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
    setToastMessage(`Reward redeemed successfully!${suffix}`);
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
      {toastMessage && (
        <div className="notification-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
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
