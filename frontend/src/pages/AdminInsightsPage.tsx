import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import SectionHeader from '../components/Common/SectionHeader';

interface AnalyticsOverview {
  recognitions_last_7_days: number;
  recognitions_last_30_days: number;
  top_departments: Array<{
    department: string;
    recognition_count: number;
  }>;
  points_summary: {
    awarded: number;
    redeemed: number;
  };
}

const AdminInsightsPage: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canAccess = user?.role === 'hr_admin';

  useEffect(() => {
    if (!canAccess) {
      return;
    }

    const loadInsights = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<AnalyticsOverview>('/admin/analytics/overview');
        setAnalytics(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Unable to load insights right now.');
      } finally {
        setLoading(false);
      }
    };

    void loadInsights();
  }, [canAccess]);

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-slate-900">HR insights</h1>
        <p className="mt-3 text-sm text-slate-600">You do not have access to HR insights.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">HR insights</h1>
          <p className="mt-2 text-sm text-slate-600">
            Recognition activity and points insights across the organization.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading insights...
          </div>
        ) : analytics ? (
          <section className="space-y-4">
            <SectionHeader
              title="HR dashboard"
              subtitle="Team recognition and points activity snapshot"
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Recognitions (7 days)</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {analytics.recognitions_last_7_days}
                </p>
                <p className="mt-1 text-xs text-slate-500">Last week</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Recognitions (30 days)</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {analytics.recognitions_last_30_days}
                </p>
                <p className="mt-1 text-xs text-slate-500">Last month</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Top department</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {analytics.top_departments[0]?.department ?? 'No data'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {analytics.top_departments[0]?.recognition_count ?? 0} recognitions
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Points activity</p>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Awarded</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {analytics.points_summary.awarded}
                    </p>
                  </div>
                  <div className="h-10 w-px bg-slate-200" aria-hidden />
                  <div>
                    <p className="text-xs text-slate-500">Redeemed</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {analytics.points_summary.redeemed}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No insights available yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminInsightsPage;
