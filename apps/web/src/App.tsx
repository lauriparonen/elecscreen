import { DailyList } from './features/daily-list/DailyList.tsx';

export function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <h1 className="text-xl font-semibold">Electricity — daily statistics</h1>
          <p className="text-sm text-slate-500">
            Finnish production, consumption, and spot prices, grouped by day.
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">
        <DailyList />
      </main>
    </div>
  );
}
