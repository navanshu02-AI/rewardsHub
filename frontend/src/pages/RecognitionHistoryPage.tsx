import React from 'react';
import { useSearchParams } from 'react-router-dom';
import RecognitionFeed from '../components/Recognition/RecognitionFeed';
import RecognitionHistory from '../components/Recognition/RecognitionHistory';

type RecognitionTab = 'history' | 'feed';

const TAB_LABELS: Record<RecognitionTab, string> = {
  history: 'History',
  feed: 'Company feed'
};

const RecognitionHistoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as RecognitionTab | null;
  const [activeTab, setActiveTab] = React.useState<RecognitionTab>(
    tabParam && Object.keys(TAB_LABELS).includes(tabParam) ? tabParam : 'history'
  );

  React.useEffect(() => {
    if (tabParam && Object.keys(TAB_LABELS).includes(tabParam)) {
      setActiveTab(tabParam);
    } else {
      setActiveTab('history');
    }
  }, [tabParam]);

  const handleTabChange = (tab: RecognitionTab) => {
    setActiveTab(tab);
    if (tab === 'history') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="border-b border-gray-200 mb-6">
        <div className="-mb-px flex flex-wrap gap-4" role="tablist" aria-label="Recognition tabs">
          {(Object.keys(TAB_LABELS) as RecognitionTab[]).map((tab) => (
            <button
              key={tab}
              id={`recognition-tab-${tab}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`recognition-panel-${tab}`}
              onClick={() => handleTabChange(tab)}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'history' && (
        <div role="tabpanel" id="recognition-panel-history" aria-labelledby="recognition-tab-history">
          <RecognitionHistory />
        </div>
      )}

      {activeTab === 'feed' && (
        <div role="tabpanel" id="recognition-panel-feed" aria-labelledby="recognition-tab-feed">
          <RecognitionFeed />
        </div>
      )}
    </div>
  );
};

export default RecognitionHistoryPage;
