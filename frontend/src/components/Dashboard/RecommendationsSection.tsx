import React from 'react';
import RewardCard from '../Rewards/RewardCard';

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

interface RecommendationsSectionProps {
  recommendations: Recommendations;
  onRedeemReward: (rewardId: string) => void;
  userPoints: number;
}

const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({
  recommendations,
  onRedeemReward,
  userPoints
}) => {
  if (!recommendations.rewards || recommendations.rewards.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recommended for You 🎯</h2>
          <p className="text-gray-600 mt-1">{recommendations.reason}</p>
        </div>
        <div className="text-right">
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {Math.round(recommendations.confidence_score * 100)}% Match
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Based on: {recommendations.personalization_factors.join(', ')}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.rewards.slice(0, 3).map((reward) => (
          <RewardCard
            key={reward.id}
            reward={reward}
            onRedeemReward={onRedeemReward}
            userPoints={userPoints}
            isRecommended={true}
          />
        ))}
      </div>
    </div>
  );
};

export default RecommendationsSection;
