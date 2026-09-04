import { useQuery } from '@tanstack/react-query';
import { dailyResponse, type DailyResponse } from '@repo/shared';
import { fetchJson } from '../../api/client.ts';

export function useDaily() {
  return useQuery<DailyResponse>({
    queryKey: ['daily'],
    queryFn: () => fetchJson('/api/daily', dailyResponse),
    retry: 1,
  });
}
