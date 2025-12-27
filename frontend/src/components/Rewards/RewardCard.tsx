import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

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

interface RewardCardProps {
  reward: Reward;
  onRedeemReward: (rewardId: string) => void;
  userPoints: number;
  isRecommended?: boolean;
}

const RewardCard: React.FC<RewardCardProps> = ({
  reward,
  onRedeemReward,
  userPoints,
  isRecommended = false
}) => {
  const { currency, formatCurrency } = useAuth();

  const currentPrice = reward.prices?.[currency] ?? 0;
  const originalPrice = reward.original_prices?.[currency];

  const canRedeem = userPoints >= reward.points_required && reward.availability > 0;

  return (
    <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden ${isRecommended ? 'ring-2 ring-blue-200' : ''}`}>
      {isRecommended && (
        <div className="bg-blue-600 text-white text-xs font-medium px-3 py-1 text-center">
          RECOMMENDED FOR YOU
        </div>
      )}
      
      <div className="relative">
        <img
          src={reward.image_url || 'https://images.unsplash.com/photo-1543465077-db45d34aa2ab'}
          alt={reward.title}
          className="w-full h-48 object-cover"
        />
        {reward.is_popular && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            POPULAR
          </div>
        )}
        {originalPrice && originalPrice > currentPrice && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
            SAVE {formatCurrency(originalPrice - currentPrice)}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{reward.title}</h3>
          <div className="flex flex-col items-end ml-2">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mb-1 whitespace-nowrap">
              {reward.category.replace('_', ' ')}
            </span>
            {reward.brand && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded whitespace-nowrap">
                {reward.brand}
              </span>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{reward.description}</p>

        {reward.rating && (
          <div className="flex items-center mb-2">
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className={`w-4 h-4 ${i < Math.floor(reward.rating!) ? 'fill-current' : 'text-gray-300'}`} viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                </svg>
              ))}
            </div>
            <span className="text-sm text-gray-500 ml-2">({reward.review_count})</span>
          </div>
        )}

        {originalPrice && originalPrice > currentPrice && (
          <div className="mb-2">
            <span className="text-sm text-gray-500 line-through">{formatCurrency(originalPrice)}</span>
            <span className="text-sm text-red-600 ml-2 font-medium">
              Save {formatCurrency(originalPrice - currentPrice)}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-bold text-blue-600">{reward.points_required} pts</span>
          <span className="text-sm text-gray-500">{formatCurrency(currentPrice)}</span>
        </div>

        <div className="text-xs text-gray-500 mb-3">
          <div>Delivery: {reward.delivery_time || '3-5 business days'}</div>
          <div>Stock: {reward.availability} available</div>
        </div>

        <button
          onClick={() => onRedeemReward(reward.id)}
          disabled={!canRedeem}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            canRedeem
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {reward.availability <= 0 
            ? 'Out of Stock' 
            : userPoints >= reward.points_required 
              ? 'Redeem Now' 
              : 'Insufficient Points'
          }
        </button>
      </div>
    </div>
  );
};

export default RewardCard;
