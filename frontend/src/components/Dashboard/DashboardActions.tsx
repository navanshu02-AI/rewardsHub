import React from 'react';

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
        <button
          type="button"
          onClick={onOpenRecognition}
          data-testid="recognition-open"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Give recognition
        </button>
        <button
          type="button"
          onClick={onBrowseRewards}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Browse rewards
        </button>
        {aiEnabled && onBrowseRecommendations && (
          <button
            type="button"
            onClick={onBrowseRecommendations}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Get recommendations
          </button>
        )}
      </div>
    </div>
  );
};

export default DashboardActions;
