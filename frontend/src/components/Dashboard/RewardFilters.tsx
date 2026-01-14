import React, { useMemo, useState } from 'react';
import { Card } from '../ui/Card';

export interface FilterOption {
  value: string;
  label: string;
}

interface RewardFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  rewardType: string;
  onRewardTypeChange: (value: string) => void;
  minPoints: string;
  onMinPointsChange: (value: string) => void;
  maxPoints: string;
  onMaxPointsChange: (value: string) => void;
  categories: FilterOption[];
  rewardTypes: FilterOption[];
}

const RewardFilters: React.FC<RewardFiltersProps> = ({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  rewardType,
  onRewardTypeChange,
  minPoints,
  onMinPointsChange,
  maxPoints,
  onMaxPointsChange,
  categories,
  rewardTypes
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = useMemo(() => {
    const filters = [category, rewardType, minPoints, maxPoints];
    return filters.filter((value) => value.trim().length > 0).length;
  }, [category, rewardType, minPoints, maxPoints]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium text-slate-700" htmlFor="reward-search">
          Search rewards
        </label>
        <input
          id="reward-search"
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by title, brand, or description"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <Card className="w-full overflow-hidden">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 px-6 py-3 text-sm font-semibold text-slate-700"
          aria-expanded={isExpanded}
          aria-controls="reward-filters-panel"
          data-testid="reward-filters-toggle"
        >
          <span className="flex items-center gap-2">
            Filters
            <span
              className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700"
              data-testid="reward-filters-count"
            >
              {activeFilterCount}
            </span>
          </span>
          <span
            className={`text-slate-400 transition-transform ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
            aria-hidden="true"
          >
            ▼
          </span>
        </button>
        {isExpanded && (
          <div
            id="reward-filters-panel"
            data-testid="reward-filters-panel"
            className="border-t border-slate-200 px-6 py-4"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="reward-category">
                  Category
                </label>
                <select
                  id="reward-category"
                  value={category}
                  onChange={(event) => onCategoryChange(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All categories</option>
                  {categories.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="reward-type">
                  Reward type
                </label>
                <select
                  id="reward-type"
                  value={rewardType}
                  onChange={(event) => onRewardTypeChange(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All types</option>
                  {rewardTypes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="min-points">
                  Min points
                </label>
                <input
                  id="min-points"
                  type="number"
                  min={0}
                  value={minPoints}
                  onChange={(event) => onMinPointsChange(event.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="max-points">
                  Max points
                </label>
                <input
                  id="max-points"
                  type="number"
                  min={0}
                  value={maxPoints}
                  onChange={(event) => onMaxPointsChange(event.target.value)}
                  placeholder="1000"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default RewardFilters;
