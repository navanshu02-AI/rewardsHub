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

interface RewardsCatalogProps {
  rewards: Reward[];
  onRedeemReward: (rewardId: string) => void;
  userPoints: number;
}

const RewardsCatalog: React.FC<RewardsCatalogProps> = ({
  rewards,
  onRedeemReward,
  userPoints
}) => {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Rewards Catalog 🛍️</h2>
        <div className="text-sm text-gray-500">
          {rewards.length} rewards available
        </div>
      </div>
      
      {rewards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              onRedeemReward={onRedeemReward}
              userPoints={userPoints}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No rewards available yet</h3>
          <p className="text-gray-500">Add rewards for your preferred regions to get started!</p>
        </div>
      )}
    </div>
  );
};

export default RewardsCatalog;
