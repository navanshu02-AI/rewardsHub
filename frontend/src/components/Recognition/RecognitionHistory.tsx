import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api/v1`;

type RecognitionScope = 'peer' | 'report' | 'global';

type RecognitionEntry = {
  id: string;
  scope: RecognitionScope;
  message: string;
  points_awarded: number;
  recognition_type: string;
  created_at: string;
  from_user: RecognitionUserSummary;
  to_users: RecognitionUserSummary[];
};

type RecognitionUserSummary = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  department?: string | null;
};

type Direction = 'received' | 'sent';

const RECOGNITION_TYPE_LABELS: Record<string, string> = {
  peer_to_peer: 'Peer to Peer',
  manager_to_employee: 'Manager to Employee',
  team_recognition: 'Team Recognition',
  company_wide: 'Company Wide',
  milestone: 'Milestone',
  spot_award: 'Spot Award'
};

interface RecognitionHistoryProps {
  refreshToken?: number;
  showHeader?: boolean;
}

const RecognitionHistory: React.FC<RecognitionHistoryProps> = ({ refreshToken, showHeader = true }) => {
  const { user } = useAuth();
  const [direction, setDirection] = useState<Direction>('received');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [history, setHistory] = useState<RecognitionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { direction };
      if (typeFilter !== 'all') {
        params.recognition_type = typeFilter;
      }
      const response = await axios.get<RecognitionEntry[]>(`${API}/recognitions`, { params });
      setHistory(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to load recognition history right now.');
    } finally {
      setLoading(false);
    }
  }, [direction, typeFilter]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory, refreshToken]);

  const renderEmptyState = () => {
    const subject = direction === 'received' ? 'recognitions yet' : 'recognitions sent so far';
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
        <p>{`No ${subject}. Once ${direction === 'received' ? 'colleagues celebrate you' : 'you celebrate a teammate'}, entries will show up here.`}</p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      {showHeader && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recognition history</h2>
          <p className="text-sm text-gray-500">
            Track the kudos you’ve {direction === 'received' ? 'earned' : 'shared'}.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
          {(['received', 'sent'] as Direction[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setDirection(item)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                direction === item ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {item === 'received' ? 'Received' : 'Sent'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="recognition-type-filter" className="text-sm text-gray-600">
            Type
          </label>
          <select
            id="recognition-type-filter"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All types</option>
            {Object.entries(RECOGNITION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
        </div>
      ) : history.length === 0 ? (
        <div className="mt-6">{renderEmptyState()}</div>
      ) : (
        <ul className="mt-6 space-y-4">
          {history.map((entry) => {
            const isSender = entry.from_user?.id === user?.id;
            const recipients = entry.to_users
              .map((recipient) => `${recipient.first_name} ${recipient.last_name}`)
              .join(', ');
            const displayType = RECOGNITION_TYPE_LABELS[entry.recognition_type] || entry.recognition_type;
            return (
              <li key={entry.id} className="rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                        {displayType}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                        {entry.scope === 'peer' ? 'Peer' : entry.scope === 'report' ? 'Direct report' : 'Global'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{entry.message}</p>
                    <p className="mt-3 text-sm text-gray-500">
                      {isSender ? 'You recognised' : `${entry.from_user.first_name} ${entry.from_user.last_name} recognised`}{' '}
                      <span className="font-medium text-gray-700">{recipients || 'the team'}</span>
                      {` with ${entry.points_awarded} point${entry.points_awarded === 1 ? '' : 's'}.`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                    </svg>
                    +{entry.points_awarded} pts
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default RecognitionHistory;
