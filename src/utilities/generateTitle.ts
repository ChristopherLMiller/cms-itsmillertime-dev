import { GenerateTitle } from 'node_modules/@payloadcms/plugin-seo/dist/types';
import { LabelFunction, StaticLabel } from 'payload';

export const generateTitle: GenerateTitle = async ({ doc, collectionConfig }) => {
  let pageTitle = '';
  let collectionName = '' as StaticLabel | LabelFunction;

  if (collectionConfig?.labels?.singular) {
    switch (collectionConfig?.slug) {
      case 'gardens': {
        pageTitle = doc?.name;
        collectionName = collectionConfig?.labels?.singular;
        break;
      }
      case 'gallery-albums':
      case 'gallery-images':
      case 'models':
      case 'posts':
      case 'pages': {
        pageTitle = doc?.title;
        collectionName = collectionConfig?.labels?.singular;
        break;
      }
      // This will appear for anything not specifically accounted for, useful for debugging later
      default: {
        pageTitle = `Default: ${collectionConfig?.slug}`;
      }
    }
  }

  return `${pageTitle} | ${collectionName} | ItsMillerTime`;
};
