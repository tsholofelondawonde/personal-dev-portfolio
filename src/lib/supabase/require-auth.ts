import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

// A compromised session or a buggy client retry-loop can otherwise hammer
// mutation endpoints indefinitely — auth alone doesn't limit call volume.
const MUTATION_LIMIT = 30;
const MUTATION_WINDOW_MS = 60 * 1000;

/**
 * Server-side auth guard for Server Actions.
 * Throws an error if there is no authenticated session, which Next.js
 * surfaces as a 500 and prevents the action body from executing. Also rate
 * limits per authenticated user, since auth alone doesn't cap call volume.
 *
 * Always call this as the very first line of every admin Server Action —
 * middleware alone is not sufficient because Server Actions can be invoked
 * directly via POST and are outside the middleware routing layer.
 */
export async function requireAuth(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized: you must be signed in to perform this action.');
  }

  if (!checkRateLimit(`admin-mutation:${user.id}`, { limit: MUTATION_LIMIT, windowMs: MUTATION_WINDOW_MS })) {
    throw new Error('Too many requests. Please slow down and try again shortly.');
  }
}
