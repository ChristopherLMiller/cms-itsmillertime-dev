import { GenerateURL } from 'node_modules/@payloadcms/plugin-seo/dist/types';

export const generateURL: GenerateURL = async ({ doc, collectionSlug }) => {
  return `https://www.itsmillertime.dev/${collectionSlug}/${doc?.slug || doc?.settings?.slug}`;
};
