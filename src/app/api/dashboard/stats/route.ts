import config from '@payload-config';
import { getPayload } from 'payload';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Plausible } from '@/lib/plausible';

export async function GET() {
  try {
    const payload = await getPayload({ config });
    const headersList = await headers();
    const { user } = await payload.auth({ headers: headersList });

    // Require authentication
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch recent content with RBAC applied automatically by Payload
    const [recentPosts, recentModels, recentAlbums, recentMedia, plausibleStats] =
      await Promise.allSettled([
        payload.find({
          collection: 'posts',
          limit: 5,
          sort: '-updatedAt',
          depth: 1,
        }),
        payload.find({
          collection: 'models',
          limit: 5,
          sort: '-updatedAt',
          depth: 1,
        }),
        payload.find({
          collection: 'gallery-albums',
          limit: 5,
          sort: '-updatedAt',
          depth: 1,
        }),
        payload.find({
          collection: 'media',
          limit: 5,
          sort: '-createdAt',
          depth: 0,
        }),
        (async () => {
          try {
            const plausible = new Plausible();
            return await plausible.getStats('30d');
          } catch (error) {
            console.error('Failed to fetch Plausible stats:', error);
            return null;
          }
        })(),
      ]);

    return NextResponse.json({
      posts: recentPosts.status === 'fulfilled' ? recentPosts.value.docs : [],
      models: recentModels.status === 'fulfilled' ? recentModels.value.docs : [],
      albums: recentAlbums.status === 'fulfilled' ? recentAlbums.value.docs : [],
      media: recentMedia.status === 'fulfilled' ? recentMedia.value.docs : [],
      analytics: plausibleStats.status === 'fulfilled' ? plausibleStats.value : null,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
