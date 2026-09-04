import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  dailyResponse,
  type DailyResponse,
  type DailySortBy,
  type DailySortDir,
} from '@repo/shared';
import { fetchJson } from '../../api/client.ts';

export function useDaily(
  page: number,
  pageSize: number,
  sortBy: DailySortBy,
  sortDir: DailySortDir,
) {
  return useQuery<DailyResponse>({
    queryKey: ['daily', page, pageSize, sortBy, sortDir],
    queryFn: () =>
      fetchJson(
        `/api/daily?page=${page}&pageSize=${pageSize}&sortBy=${sortBy}&sortDir=${sortDir}`,
        dailyResponse,
      ),
    retry: 1,
    placeholderData: keepPreviousData,
  });
}
