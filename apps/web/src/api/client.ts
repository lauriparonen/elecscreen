import { z } from 'zod';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchJson<S extends z.ZodType>(
  path: string,
  schema: S,
  init?: RequestInit,
): Promise<z.infer<S>> {
  const res = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, `${res.status} ${res.statusText} — ${path}`);
  }

  const raw = (await res.json()) as unknown;
  return schema.parse(raw);
}
