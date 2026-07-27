import { corsPreflight, withCors } from '@/lib/api/cors';
import { isAdminAuthFailure, requireAdmin } from '@/lib/auth/requireAdmin';
import { Clockify } from '@/lib/clockify';
import { NextRequest, NextResponse } from 'next/server';

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req, ['POST', 'OPTIONS']);
}

type StopBody = {
  /** ISO-8601 end time; defaults to now. */
  end?: string;
};

/** POST /api/clockify/timer/stop — stop the running Clockify timer (admin only). */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isAdminAuthFailure(auth)) {
    return withCors(req, auth.error, ['POST', 'OPTIONS']);
  }

  let body: StopBody = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text) as StopBody;
  } catch {
    return withCors(
      req,
      NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
      ['POST', 'OPTIONS'],
    );
  }

  try {
    const clockify = new Clockify();
    const timer = await clockify.stopTimer(body.end);
    return withCors(req, NextResponse.json({ timer }), ['POST', 'OPTIONS']);
  } catch (error) {
    console.error('Error stopping Clockify timer:', error);
    const message = error instanceof Error ? error.message : 'Failed to stop Clockify timer';
    return withCors(
      req,
      NextResponse.json({ error: message }, { status: 502 }),
      ['POST', 'OPTIONS'],
    );
  }
}
