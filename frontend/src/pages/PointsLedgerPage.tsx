import React, { useEffect, useState } from 'react';
import api from '../lib/api';

interface PointsLedgerEntry {
  id: string;
  delta: number;
  reason: string;
  ref_type: string;
  ref_id: string;
  created_at: string;
}

const PointsLedgerPage: React.FC = () => {
  const [entries, setEntries] = useState<PointsLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLedger = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get<PointsLedgerEntry[]>('/points/ledger/me');
        setEntries(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Unable to load points ledger right now.');
      } finally {
        setLoading(false);
      }
    };

    void fetchLedger();
  }, []);

  const formatDelta = (delta: number) => `${delta > 0 ? '+' : ''}${delta}`;

  const formatReason = (reason: string) => reason.replace(/_/g, ' ');

  const formatReferenceLabel = (refType: string) => {
    if (refType === 'recognition') {
      return 'Recognition ID';
    }
    if (refType === 'redemption') {
      return 'Redemption ID';
    }
    return 'Reference ID';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Points ledger</h2>
          <p className="text-sm text-gray-500">Review how your points balance has changed over time.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
            <p>No points activity yet. Send or redeem recognitions to build your ledger.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" data-testid="points-ledger-table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Delta</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reason / type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Recognition ID / Redemption ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {entries.map((entry) => (
                  <tr key={entry.id} data-testid="points-ledger-row">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      <span className={entry.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {formatDelta(entry.delta)} pts
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="font-medium text-gray-900">{formatReason(entry.reason)}</div>
                      <div className="text-xs text-gray-500">{entry.ref_type.replace(/_/g, ' ')}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="text-xs uppercase tracking-wide text-gray-400">
                        {formatReferenceLabel(entry.ref_type)}
                      </div>
                      <div className="font-mono text-xs text-gray-600 break-all">{entry.ref_id}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PointsLedgerPage;
