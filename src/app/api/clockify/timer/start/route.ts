import { corsPreflight, withCors } from '@/lib/api/cors';
import { isAdminAuthFailure, requireAdmin } from '@/lib/auth/requireAdmin';
import { Clockify } from '@/lib/clockify';
import { NextRequest, NextResponse } from 'next/server';

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req, ['POST', 'OPTIONS']);
}

type StartBody = {
  projectId?: string;
  description?: string;
  billable?: boolean;
  start?: string;
};

/** POST /api/clockify/timer/start — start a Clockify timer (admin only). */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isAdminAuthFailure(auth)) {
    return withCors(req, auth.error, ['POST', 'OPTIONS']);
  }

  let body: StartBody = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text) as StartBody;
  } catch {
    return withCors(
      req,
      NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
      ['POST', 'OPTIONS'],
    );
  }

  if (body.projectId != null && typeof body.projectId !== 'string') {
    return withCors(
      req,
      NextResponse.json({ error: 'projectId must be a string' }, { status: 400 }),
      ['POST', 'OPTIONS'],
    );
  }

  try {
    const clockify = new Clockify();
    const timer = await clockify.startTimer({
      projectId: body.projectId,
      description: body.description,
      billable: body.billable,
      start: body.start,
    });
    return withCors(req, NextResponse.json({ timer }), ['POST', 'OPTIONS']);
  } catch (error) {
    console.error('Error starting Clockify timer:', error);
    const message = error instanceof Error ? error.message : 'Failed to start Clockify timer';
    return withCors(
      req,
      NextResponse.json({ error: message }, { status: 502 }),
      ['POST', 'OPTIONS'],
    );
  }
}
