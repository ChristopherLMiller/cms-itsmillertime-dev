import { hasAnyRole } from '@delmaredigital/payload-better-auth';
import config from '@payload-config';
import { headers } from 'next/headers';
import { getPayload } from 'payload';

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

    const canReadJobs =
      user.collection === 'payload-mcp-api-keys' || hasAnyRole(user, ['admin']);
    if (!canReadJobs) {
      return Response.json({ count: 0 });
    }

    // 3.89 denies payload-jobs CRUD by default; honor collection read access.
    const activeJobs = await payload.count({
      collection: 'payload-jobs',
      user,
      overrideAccess: false,
    });

    return Response.json({ count: activeJobs.totalDocs ?? 0 });
  } catch (error) {
    console.error('Error fetching active jobs:', error);
    return Response.json({ count: 0 });
  }
}
