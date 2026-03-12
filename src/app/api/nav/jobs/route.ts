import config from '@payload-config';
import { getPayload } from 'payload';
import { headers } from 'next/headers';

export async function GET(): Promise<Response> {
  try {
    const payload = await getPayload({ config });
    const headersList = await headers();

    // Pass JWT from cookie as Authorization header for auth in production
    const cookieHeader = headersList.get('cookie');
    const payloadTokenMatch = cookieHeader?.match(/payload-token=([^;]+)/);
    const payloadToken = payloadTokenMatch ? payloadTokenMatch[1] : null;
    const authHeaders = new Headers(headersList);
    if (payloadToken) {
      authHeaders.set('Authorization', `JWT ${payloadToken}`);
    }

    const { user } = await payload.auth({ headers: authHeaders });

    if (!user) {
      return Response.json({ count: 0 });
    }

    const activeJobs = await payload.count({
      collection: 'payload-jobs',
    });

    return Response.json({ count: activeJobs.totalDocs ?? 0 });
  } catch (error) {
    console.error('Error fetching active jobs:', error);
    return Response.json({ count: 0 });
  }
}
