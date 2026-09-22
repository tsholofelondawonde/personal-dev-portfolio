'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

const MAX_ATTEMPTS = 5;
const MAX_ATTEMPTS_PER_IP = 20;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function signInAction(
  email: string,
  password: string,
  redirectedFrom: string
): Promise<{ error: string }> {
  const hdrs = await headers();
  // x-forwarded-for is set by the hosting platform's edge; treat it as
  // untrusted/spoofable if this is ever self-hosted behind an unknown proxy.
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const ipKey = `ip:${ip}`;
  const emailKey = `${ip}:${email.toLowerCase()}`;

  // Two buckets: a per-email limit (defeats guessing one account's password)
  // and a coarser per-IP limit (defeats rotating through many emails from
  // the same IP to dodge the per-email bucket).
  const ipOk = checkRateLimit(ipKey, { limit: MAX_ATTEMPTS_PER_IP, windowMs: WINDOW_MS });
  const emailOk = checkRateLimit(emailKey, { limit: MAX_ATTEMPTS, windowMs: WINDOW_MS });
  if (!ipOk || !emailOk) {
    return { error: 'Too many sign-in attempts. Please wait a few minutes and try again.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Never forward the provider's raw message — some Supabase error strings
    // (e.g. "Email not confirmed") are differentiable and would let an
    // attacker enumerate valid accounts.
    console.error('Admin sign-in failed:', error.message);
    return { error: 'Invalid email or password.' };
  }

  // Validate the redirect target to prevent open-redirect attacks.
  // Only allow relative paths that start with /admin; discard anything else.
  const redirectTo =
    redirectedFrom.startsWith('/admin') && !redirectedFrom.startsWith('//')
      ? redirectedFrom
      : '/admin/blog';
  redirect(redirectTo);
}
