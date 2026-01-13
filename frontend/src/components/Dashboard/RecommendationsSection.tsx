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
  recommendations: Recommendations | null;
  onRedeemReward: (rewardId: string) => void;
  userPoints: number;
}

const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({
  recommendations,
  onRedeemReward,
  userPoints
}) => {
  const hasRecommendations = Boolean(recommendations?.rewards?.length);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Recommended for you</h2>
          <p className="mt-2 text-sm text-slate-600">
            {hasRecommendations
              ? recommendations?.reason
              : 'Personalized reward ideas will appear here once they are ready.'}
          </p>
        </div>
        {hasRecommendations && (
          <div className="text-left lg:text-right">
            <div className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
              {Math.round((recommendations?.confidence_score ?? 0) * 100)}% Match
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Based on: {recommendations?.personalization_factors.join(', ')}
            </p>
          </div>
        )}
      </div>

      {hasRecommendations && (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {recommendations?.rewards.slice(0, 3).map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              onRedeemReward={onRedeemReward}
              userPoints={userPoints}
              isRecommended={true}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default RecommendationsSection;
