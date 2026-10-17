import React from 'react';
import { Search, X, Filter } from 'lucide-react';

/**
 * FilterBar
 * Responsive filter controls inspired by the reference dashboard layouts.
 * Supports text search, select dropdowns, active filters count, and reset.
 */
export default function FilterBar({
  searchQuery,
  search,
  onSearchChange,
  searchPlaceholder = 'Search complaints by ID, title, or location...',
  filters = [], // Array of { id, label, value, options: [{ value, label }], onChange }
  onReset,
  totalResults,
}) {
  const query = searchQuery ?? search ?? '';
  const hasActiveFilters =
    Boolean(query) || filters.some((f) => f.value && f.value !== 'all');

  return (
    <div className="bg-[#FFFDF9] rounded-2xl border border-[#EBE3D0] p-3 sm:p-4 mb-5 shadow-2xs">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="filter-search-input"
            aria-label={searchPlaceholder}
            type="text"
            value={query}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-9 py-2 rounded-xl bg-[#FAF6EE] border border-[#E2D8C3] text-xs sm:text-sm text-stone-800 placeholder-stone-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600 focus:border-transparent transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-500 hover:text-stone-700 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none rounded-lg"
              aria-label="Clear search query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {filters.map((filter, idx) => (
            <div key={filter.id || filter.label || idx} className="relative min-w-[130px] flex-1 sm:flex-initial">
              <select
                id={`filter-${filter.id}`}
                aria-label={filter.label}
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 rounded-xl bg-[#FAF6EE] border border-[#E2D8C3] text-xs font-semibold text-stone-700 hover:bg-[#F5EFE0] focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer transition-colors"
              >
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-stone-400">
                <Filter className="w-3 h-3" />
              </div>
            </div>
          ))}

          {/* Reset Action */}
          {hasActiveFilters && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {/* Results Badge */}
          {typeof totalResults === 'number' && (
            <span className="text-[11px] font-bold text-stone-700 px-2.5 py-1.5 rounded-lg bg-stone-100 self-center">
              {totalResults} {totalResults === 1 ? 'match' : 'matches'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
