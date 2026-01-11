import React from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface OrgChartNode {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  department?: string | null;
  manager_id?: string | null;
  children: OrgChartNode[];
}

const OrgChartPage: React.FC = () => {
  const { user } = useAuth();
  const [nodes, setNodes] = React.useState<OrgChartNode[]>([]);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const isHrAdmin = user?.role === 'hr_admin';

  React.useEffect(() => {
    if (!isHrAdmin) {
      setLoading(false);
      return;
    }

    const fetchChart = async () => {
      try {
        const response = await api.get('/users/org-chart');
        setNodes(response.data);
        setExpandedIds(new Set(response.data.map((node: OrgChartNode) => node.id)));
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Unable to load org chart');
      } finally {
        setLoading(false);
      }
    };

    fetchChart();
  }, [isHrAdmin]);

  const toggleNode = (nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const renderNode = (node: OrgChartNode, depth: number) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const paddingLeft = depth * 24;

    return (
      <div key={node.id} className="mt-3">
        <div
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          style={{ marginLeft: paddingLeft }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.id)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '−' : '+'}
            </button>
          ) : (
            <span className="h-7 w-7" />
          )}
          <div>
            <div className="text-sm font-semibold text-slate-800">
              {node.first_name} {node.last_name}
            </div>
            <div className="text-xs text-slate-500">
              {node.role.replace('_', ' ')}
              {node.department ? ` • ${node.department}` : ''}
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="border-l border-slate-200 pl-3">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isHrAdmin) {
    return (
      <div className="mx-auto mt-10 max-w-4xl rounded-2xl bg-white p-8 shadow">
        <h1 className="text-2xl font-semibold text-slate-900">Org Chart</h1>
        <p className="mt-3 text-sm text-slate-600">
          You do not have access to view the organization chart. Please contact your HR administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-5xl rounded-2xl bg-white p-8 shadow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Org Chart</h1>
          <p className="mt-2 text-sm text-slate-600">
            Explore reporting lines and expand each leader to see their team.
          </p>
        </div>
      </div>

      {loading && <p className="mt-6 text-sm text-slate-500">Loading org chart…</p>}
      {error && <p className="mt-6 text-sm text-rose-600">{error}</p>}
      {!loading && !error && nodes.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">No org chart data available.</p>
      )}
      {!loading && !error && nodes.length > 0 && (
        <div className="mt-6">{nodes.map((node) => renderNode(node, 0))}</div>
      )}
    </div>
  );
};

export default OrgChartPage;
