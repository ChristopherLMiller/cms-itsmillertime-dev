import { getServerSideURL } from '@/utilities/getURL';
import { lexicalToText } from '@/utilities/lexicalToText';
import { truncateText } from '@/utilities/truncateText';
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
    generateTitle: ({ doc }) => {
      return doc?.title ? `${doc.title} | ItsMillerTime` : 'ItsMillerTime';
    },
    generateURL: ({ doc }) => {
      const url = getServerSideURL();
      return doc?.slug ? `${url}/${doc.slug}` : url;
    },
    generateDescription: ({ doc }) => {
      if (doc?.content) {
        return truncateText(lexicalToText(doc?.content));
      } else {
        return 'Default description, i need implemented';
      }
    },
    generateImage: async ({ doc }) => {
      if (doc?.featuredImage) {
        return doc?.featuredImage;
      }
    },
  }),
  searchPlugin({
    collections: ['posts'],
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
