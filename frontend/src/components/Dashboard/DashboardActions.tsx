import React from 'react';
import Button from '../ui/Button';

interface DashboardActionsProps {
  onOpenRecognition: () => void;
  onBrowseRewards: () => void;
  onBrowseRecommendations?: () => void;
  aiEnabled: boolean;
}

const DashboardActions: React.FC<DashboardActionsProps> = ({
  onOpenRecognition,
  onBrowseRewards,
  onBrowseRecommendations,
  aiEnabled
}) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Primary actions</p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={onOpenRecognition} data-testid="recognition-open">
          Give recognition
        </Button>
        <Button type="button" variant="secondary" onClick={onBrowseRewards}>
          Browse rewards
        </Button>
        {aiEnabled && onBrowseRecommendations && (
          <Button type="button" variant="secondary" onClick={onBrowseRecommendations}>
            Get recommendations
          </Button>
        )}
      </div>
    </div>
  );
};

export default DashboardActions;
