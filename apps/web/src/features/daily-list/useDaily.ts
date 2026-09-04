import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { dailyResponse, type DailyResponse } from '@repo/shared';
import { fetchJson } from '../../api/client.ts';

export function useDaily(page: number, pageSize: number) {
  return useQuery<DailyResponse>({
    queryKey: ['daily', page, pageSize],
    queryFn: () =>
      fetchJson(`/api/daily?page=${page}&pageSize=${pageSize}`, dailyResponse),
    retry: 1,
    placeholderData: keepPreviousData,
  });
}
