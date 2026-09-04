import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  dailyResponse,
  type DailyResponse,
  type DailySortBy,
  type DailySortDir,
} from '@repo/shared';
import { fetchJson } from '../../api/client.ts';

export interface DailyParams {
  page: number;
  pageSize: number;
  sortBy: DailySortBy;
  sortDir: DailySortDir;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
}

export function useDaily(params: DailyParams) {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    sortBy: params.sortBy,
    sortDir: params.sortDir,
  });
  if (params.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params.dateTo) search.set('dateTo', params.dateTo);
  if (params.q) search.set('q', params.q);

  return useQuery<DailyResponse>({
    queryKey: ['daily', params],
    queryFn: () => fetchJson(`/api/daily?${search.toString()}`, dailyResponse),
    retry: 1,
    placeholderData: keepPreviousData,
  });
}
