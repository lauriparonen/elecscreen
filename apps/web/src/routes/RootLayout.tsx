import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

interface RootLayoutProps {
  children: ReactNode;
}

export function RootLayout({ children }: RootLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <Link to="/" className="text-xl font-semibold text-slate-900 hover:text-slate-700">
            Electricity — daily statistics
          </Link>
          <p className="text-sm text-slate-500">
            Finnish production, consumption, and spot prices, grouped by day.
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}
