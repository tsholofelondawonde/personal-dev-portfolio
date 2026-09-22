import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Admin sign-out failed:', error.message);
    return NextResponse.json({ error: 'Sign-out failed.' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
