import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
  createAnonClient: vi.fn(),
}));

// ---------------------------------------------------------------------------
// require-auth.ts
// ---------------------------------------------------------------------------

import { requireAuth } from '@/lib/supabase/require-auth';
import { createClient } from '@/lib/supabase/server';

function makeAuthClient(user: unknown, error: unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error }),
    },
  };
}

describe('requireAuth()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves without throwing when a user is authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient({ id: 'user-123', email: 'user@example.com' }, null) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    await expect(requireAuth()).resolves.toBeUndefined();
  });

  it('throws Unauthorized when user is null and no error', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient(null, null) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    await expect(requireAuth()).rejects.toThrow('Unauthorized');
  });

  it('throws Unauthorized when Supabase returns an error', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient(null, { message: 'jwt expired' }) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    await expect(requireAuth()).rejects.toThrow('Unauthorized');
  });

  it('rate-limits repeated calls for the same authenticated user', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthClient({ id: 'rate-limit-user', email: 'user@example.com' }, null) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    // Exhaust the per-user mutation rate limit bucket (30 calls/min).
    for (let i = 0; i < 30; i++) {
      await requireAuth();
    }

    await expect(requireAuth()).rejects.toThrow('Too many requests');
  });
});
