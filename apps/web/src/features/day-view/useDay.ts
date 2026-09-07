import { useQuery } from '@tanstack/react-query';
import { dayResponse, type DayResponse } from '@repo/shared';
import { fetchJson } from '../../api/client.ts';

export function useDay(date: string) {
  return useQuery<DayResponse>({
    queryKey: ['day', date],
    queryFn: () => fetchJson(`/api/day/${date}`, dayResponse),
    retry: 1,
  });
}
