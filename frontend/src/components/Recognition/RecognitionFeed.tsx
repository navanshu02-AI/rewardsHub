import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api/v1`;

type RecognitionUserSummary = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  department?: string | null;
};

type RecognitionFeedEntry = {
  id: string;
  message: string;
  points_awarded: number;
  recognition_type: string;
  created_at: string;
  from_user: RecognitionUserSummary;
  to_users: RecognitionUserSummary[];
  values_tags: string[];
  reactions: RecognitionReaction[];
};

type RecognitionReaction = {
  emoji: string;
  user_ids: string[];
};

type ReactionResponse = {
  reactions: RecognitionReaction[];
};

const PAGE_SIZE = 10;
const REACTION_EMOJIS = ['👍', '🎉', '🙌'];

const RecognitionFeed: React.FC = () => {
  const { user } = useAuth();
  const [feed, setFeed] = useState<RecognitionFeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const lastCursor = useMemo(() => {
    if (feed.length === 0) return undefined;
    const lastEntry = feed[feed.length - 1];
    return `${lastEntry.created_at}|${lastEntry.id}`;
  }, [feed]);

  const fetchFeed = useCallback(
    async (append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setHasMore(true);
      }
      setError(null);
      try {
        const params: Record<string, string | number> = { limit: PAGE_SIZE };
        if (append && lastCursor) {
          params.cursor = lastCursor;
        }
        const response = await axios.get<RecognitionFeedEntry[]>(`${API}/recognitions/feed`, { params });
        const nextItems = response.data;
        setFeed((prev) => (append ? [...prev, ...nextItems] : nextItems));
        setHasMore(nextItems.length === PAGE_SIZE);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Unable to load the company feed right now.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [lastCursor]
  );

  useEffect(() => {
    void fetchFeed(false);
  }, [fetchFeed]);

  const handleToggleReaction = async (recognitionId: string, emoji: string) => {
    try {
      const response = await axios.post<ReactionResponse>(`${API}/recognitions/${recognitionId}/react`, { emoji });
      const updatedReactions = response.data.reactions;
      setFeed((prev) =>
        prev.map((entry) =>
          entry.id === recognitionId ? { ...entry, reactions: updatedReactions } : entry
        )
      );
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to update that reaction right now.');
    }
  };

  const renderEmptyState = () => (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
      <p>No recognitions have been shared publicly yet. Check back once teammates start celebrating wins.</p>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Company feed</h2>
        <p className="text-sm text-gray-500">Stay in the loop with public recognition across the company.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
        </div>
      ) : feed.length === 0 ? (
        renderEmptyState()
      ) : (
        <ul className="space-y-4">
          {feed.map((entry) => {
            const senderName = `${entry.from_user.first_name} ${entry.from_user.last_name}`;
            const recipients = entry.to_users
              .map((recipient) => `${recipient.first_name} ${recipient.last_name}`)
              .join(', ');
            const reactionsByEmoji = entry.reactions.reduce<Record<string, string[]>>((acc, reaction) => {
              acc[reaction.emoji] = reaction.user_ids;
              return acc;
            }, {});
            return (
              <li key={entry.id} className="rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                        {entry.recognition_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{entry.message}</p>
                    {entry.values_tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.values_tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-3 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">{senderName}</span> recognized{' '}
                      <span className="font-medium text-gray-700">{recipients || 'the team'}</span>
                      {` with ${entry.points_awarded} point${entry.points_awarded === 1 ? '' : 's'}.`}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {REACTION_EMOJIS.map((emoji) => {
                        const userIds = reactionsByEmoji[emoji] || [];
                        const hasReacted = user ? userIds.includes(user.id) : false;
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => void handleToggleReaction(entry.id, emoji)}
                            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              hasReacted
                                ? 'border-blue-200 bg-blue-50 text-blue-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{userIds.length}</span>
                          </button>
                        );
                      })}
                    </div>
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

      {!loading && feed.length > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => void fetchFeed(true)}
            disabled={!hasMore || loadingMore}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          >
            {loadingMore ? 'Loading...' : hasMore ? 'Load more' : 'No more recognitions'}
          </button>
        </div>
      )}
    </div>
  );
};

export default RecognitionFeed;
