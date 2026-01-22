import { generateDescription } from '@/utilities/generateDescription';
import { generateImage } from '@/utilities/generateImage';
import { generateTitle } from '@/utilities/generateTitle';
import { generateURL } from '@/utilities/generateURL';
import { searchPlugin } from '@payloadcms/plugin-search';
import { sentryPlugin } from '@payloadcms/plugin-sentry';
import { seoPlugin } from '@payloadcms/plugin-seo';
import { s3Storage } from '@payloadcms/storage-s3';
import * as Sentry from '@sentry/nextjs';
import { mcpPlugin } from './mcp';
import { payloadSidebar } from 'payload-sidebar-plugin';
import { payloadPluginWebhooks } from 'payload-plugin-webhooks';
import { Groups } from '@/collections/groups';
import { payloadCmdk } from '@veiag/payload-cmdk';
import type { Plugin } from 'payload';
import { shouldUseSignedURL } from '@/utilities/shouldUseSignedURL';

export const plugins: Plugin[] = [
  mcpPlugin(),
  seoPlugin({
    generateTitle: generateTitle,
    generateURL: generateURL,
    generateDescription: generateDescription,
    generateImage: generateImage,
  }),
  searchPlugin({
    collections: ['posts', 'pages', 'models', 'gardens'],
    defaultPriorities: {
      posts: 20,
    },
  }),
  sentryPlugin({
    enabled: process.env.NODE_ENV === 'production',
    Sentry,
  }),
  payloadCmdk({}),
  payloadPluginWebhooks({
    streamAuth: async (req) => {
      const apiKey = req.headers.get('x-api-key');

      if (!apiKey) {
        return false;
      }

      try {
        const result = await req.payload.find({
          collection: 'api-keys',
          where: {
            key: {
              equals: apiKey,
            },
            active: { equals: true },
          },
          limit: 1,
        });
        if (result.docs.length > 0) {
          await req.payload.update({
            collection: 'api-keys',
            id: result.docs[0].id,
            data: { lastUsed: new Date().toISOString() },
          });
          return true;
        }

        return false;
      } catch (error) {
        console.error(`Error authorizing webhook stream: ${error}`);
        return false;
      }
    },
  }),
  payloadSidebar({
    groupOrder: {
      [Groups.media]: 1,
      [Groups.blog]: 2,
      [Groups.models]: 3,
      [Groups.galleries]: 4,
      [Groups.pages]: 5,
      [Groups.authentication]: 6,
      [Groups.global]: 7,
      [Groups.misc]: 8,
    },
    icons: {
      posts: 'file-pen',
      'posts-categories': 'folder',
      'posts-tags': 'tag',
      kits: 'box',
      scales: 'scale',
      manufacturers: 'factory',
      models: 'airplane',
      'models-tags': 'tag',
      'gallery-albums': 'images',
      'gallery-images': 'image',
      'gallery-tags': 'tag',
      'gallery-categories': 'folder',
      pages: 'page',
      users: 'user',
      roles: 'users',
      'site-meta': 'layout',
      'site-navigation': 'globe',
      'map-markers': 'map',
      gardenss: 'book',
    },
    customLinks: [
      {
        label: 'Frontend',
        href: 'https://www.itsmillertime.dev',
        group: Groups.misc,
        external: true,
      },
      {
        label: 'Plausible',
        href: 'https://plausible.itsmillertime.dev',
        group: Groups.misc,
        icon: 'chart-line',
        external: true,
      },
    ],
  }),
  s3Storage({
    collections: {
      media: {
        signedDownloads: false,
      },
      'gallery-images': {
        signedDownloads: false,
      },
    },
    bucket: process.env.CLOUDFLARE_BUCKET as string,
    config: {
      endpoint: process.env.CLOUDFLARE_ENDPOINT as string,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY as string,
        secretAccessKey: process.env.CLOUDFLARE_SECRET_KEY as string,
      },
      region: process.env.CLOUDFLARE_REGION as string,
    },
  }),
];
