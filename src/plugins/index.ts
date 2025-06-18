import { generateDescription } from '@/utilities/generateDescription';
import { generateImage } from '@/utilities/generateImage';
import { generateTitle } from '@/utilities/generateTitle';
import { generateURL } from '@/utilities/generateURL';
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder';
import { searchPlugin } from '@payloadcms/plugin-search';
import { sentryPlugin } from '@payloadcms/plugin-sentry';
import { seoPlugin } from '@payloadcms/plugin-seo';
import { s3Storage } from '@payloadcms/storage-s3';
import * as Sentry from '@sentry/nextjs';
import { Plugin } from 'payload';

export const plugins: Plugin[] = [
  formBuilderPlugin({
    fields: {
      text: true,
      textarea: true,
      select: true,
      email: true,
      state: true,
      country: true,
      checkbox: true,
      number: true,
      message: true,
      payment: false,
    },
  }),
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
  s3Storage({
    collections: {
      media: true,
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
