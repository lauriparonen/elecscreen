interface FilterBarProps {
  search: string;
  dateFrom: string;
  dateTo: string;
  onSearch: (v: string) => void;
  onDateFrom: (v: string) => void;
  onDateTo: (v: string) => void;
  onClear: () => void;
  hasActiveFilter: boolean;
}

export function FilterBar({
  search,
  dateFrom,
  dateTo,
  onSearch,
  onDateFrom,
  onDateTo,
  onClear,
  hasActiveFilter,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        <span>Search date</span>
        <input
          type="search"
          inputMode="numeric"
          placeholder="2024-09"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-40 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm outline-none transition-colors duration-150 ease-out focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-slate-500">
        <span>From</span>
        <input
          type="date"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={(e) => onDateFrom(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm outline-none transition-colors duration-150 ease-out focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-slate-500">
        <span>To</span>
        <input
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(e) => onDateTo(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm outline-none transition-colors duration-150 ease-out focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      </label>

      <div className="ml-auto">
        <button
          type="button"
          onClick={onClear}
          disabled={!hasActiveFilter}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition-colors duration-150 ease-out hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
