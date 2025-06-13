import { Clockify } from '@/lib/clockify';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const clockify = new Clockify();
    const projects = await clockify.getProjects();

    return NextResponse.json(projects);
  } catch (error) {
    console.error(`Error in Clockify projects API:`, error);
    return NextResponse.json({ error: 'Failed to fetch Clockify projects' }, { status: 500 });
  }
}
