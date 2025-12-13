import { generateDescription } from '@/utilities/generateDescription';
import { generateImage } from '@/utilities/generateImage';
import { generateTitle } from '@/utilities/generateTitle';
import { generateURL } from '@/utilities/generateURL';
import { searchPlugin } from '@payloadcms/plugin-search';
import { sentryPlugin } from '@payloadcms/plugin-sentry';
import { seoPlugin } from '@payloadcms/plugin-seo';
import { s3Storage } from '@payloadcms/storage-s3';
import * as Sentry from '@sentry/nextjs';
import { Plugin } from 'payload';
import { mcpPlugin } from './mcp';
import { payloadPluginWebhooks } from 'payload-plugin-webhooks';

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
    Sentry,
  }),
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
  s3Storage({
    collections: {
      media: {
        signedDownloads: true,
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
