import config from '@payload-config';
import { getPayload } from 'payload';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const payload = await getPayload({ config });
    const headersList = await headers();
    const { user } = await payload.auth({ headers: headersList });

    if (!user) {
      return NextResponse.json({ count: 0 });
    }

    const activeJobs = await payload.count({
      collection: 'payload-jobs',
    });

    return NextResponse.json({ count: activeJobs.totalDocs || 0 });
  } catch (error) {
    console.error('Error fetching active jobs:', error);
    return NextResponse.json({ count: 0 });
  }
}
