import React from 'react';
import RewardCard from '../Rewards/RewardCard';
import SectionHeader from '../Common/SectionHeader';
import Button from '../ui/Button';
import { Card, CardContent } from '../ui/Card';

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
  aiEnabled: boolean;
  onBrowseRewards?: () => void;
}

const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({
  recommendations,
  onRedeemReward,
  userPoints,
  aiEnabled,
  onBrowseRewards
}) => {
  const hasRecommendations = Boolean(recommendations?.rewards?.length);
  const showEmptyState = !aiEnabled || !hasRecommendations;

  return (
    <Card as="section" id="recommendations-section">
      <CardContent>
        <SectionHeader
          title="Recommendations"
          subtitle={
            hasRecommendations
              ? recommendations?.reason
              : 'Explore the rewards catalog for something that fits the moment.'
          }
          action={
            hasRecommendations ? (
              <div className="text-left lg:text-right">
                <div className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                  {Math.round((recommendations?.confidence_score ?? 0) * 100)}% Match
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Based on: {recommendations?.personalization_factors.join(', ')}
                </p>
              </div>
            ) : null
          }
        />

        {!showEmptyState && (
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

        {showEmptyState && (
          <Card className="mt-6 border-dashed bg-slate-50">
            <CardContent className="flex flex-col items-start gap-3 p-4">
              <p className="text-sm font-medium text-slate-700">
                {aiEnabled
                  ? 'We are still tailoring recommendations for you. In the meantime, browse what is available.'
                  : 'Personalized recommendations are not enabled for your workspace yet.'}
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={onBrowseRewards}
                data-testid="recommendations-browse-rewards"
              >
                Browse rewards
              </Button>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default RecommendationsSection;
