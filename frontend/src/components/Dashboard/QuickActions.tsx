import React from 'react';

interface QuickActionsProps {
  onGiveRecognition: () => void;
  onRecommendGift: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onGiveRecognition, onRecommendGift }) => {
  return (
    <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
      <div className="flex flex-wrap gap-4">
        <button
          onClick={onGiveRecognition}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          Give Recognition
        </button>

        <button
          onClick={onRecommendGift}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
            />
          </svg>
          Recommend Gift
        </button>
      </div>
    </div>
  );
};

export default QuickActions;
