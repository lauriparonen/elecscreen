import { useQuery } from '@tanstack/react-query';
import { dayResponse, type DayResponse } from '@repo/shared';
import { fetchJson } from '../../api/client.ts';

export function useDay(date: string, cheapestN: number) {
  return useQuery<DayResponse>({
    queryKey: ['day', date, cheapestN],
    queryFn: () =>
      fetchJson(`/api/day/${date}?cheapestN=${cheapestN}`, dayResponse),
    retry: 1,
  });
}
