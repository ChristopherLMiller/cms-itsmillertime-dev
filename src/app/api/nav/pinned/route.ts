import { headers } from 'next/headers';
import config from '@payload-config';
import { getPayload } from 'payload';

export interface PinnedItem {
  slug: string;
  type: 'collection' | 'global' | 'custom';
  order: number;
}

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
      return Response.json({ pinnedItems: [] });
    }

    const prefs = await payload.find({
      collection: 'payload-preferences',
      where: {
        key: {
          equals: 'nav-pinned',
        },
        'user.value': {
          equals: user.id,
        },
      },
      limit: 1,
      depth: 0,
    });

    const pinnedItems = (prefs.docs[0]?.value as { pinnedItems?: PinnedItem[] })?.pinnedItems ?? [];
    return Response.json({ pinnedItems });
  } catch (error) {
    console.error('Error fetching pinned items:', error);
    return Response.json({ pinnedItems: [] });
  }
}
