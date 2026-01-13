import React from 'react';

interface RecommendationsCalloutProps {
  aiEnabled: boolean;
  hasRecommendations: boolean;
  onGetRecommendations?: () => void;
}

const RecommendationsCallout: React.FC<RecommendationsCalloutProps> = ({
  aiEnabled,
  hasRecommendations,
  onGetRecommendations
}) => {
  const showRecommendations = aiEnabled && hasRecommendations;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Recommendations</p>
      {showRecommendations ? (
        <>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Recommended for you</h2>
          <p className="mt-2 text-sm text-slate-600">
            Hand-picked rewards based on your recent activity and preferences.
          </p>
          {onGetRecommendations && (
            <button
              type="button"
              onClick={onGetRecommendations}
              className="mt-4 inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
            >
              View recommendations
            </button>
          )}
        </>
      ) : (
        <>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Get recommendations</h2>
          <p className="mt-2 text-sm text-slate-600">
            Unlock personalized reward ideas tailored to your interests.
          </p>
          <button
            type="button"
            onClick={onGetRecommendations}
            className="mt-4 inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Get recommendations
          </button>
        </>
      )}
    </section>
  );
};

export default RecommendationsCallout;
