import { corsPreflight, withCors } from '@/lib/api/cors';
import { isAdminAuthFailure, requireAdmin } from '@/lib/auth/requireAdmin';
import { Clockify } from '@/lib/clockify';
import { NextRequest, NextResponse } from 'next/server';

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req, ['GET', 'OPTIONS']);
}

/** GET /api/clockify/timer — current in-progress timer for the API-key user (admin only). */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (isAdminAuthFailure(auth)) {
    return withCors(req, auth.error, ['GET', 'OPTIONS']);
  }

  try {
    const clockify = new Clockify();
    const timers = await clockify.getInProgressTimers();
    return withCors(
      req,
      NextResponse.json({
        isRunning: timers.length > 0,
        timer: timers[0] ?? null,
        timers,
      }),
      ['GET', 'OPTIONS'],
    );
  } catch (error) {
    console.error('Error fetching Clockify timer:', error);
    return withCors(
      req,
      NextResponse.json({ error: 'Failed to fetch Clockify timer' }, { status: 500 }),
      ['GET', 'OPTIONS'],
    );
  }
}
