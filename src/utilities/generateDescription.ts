import { Manufacturer, Scale } from '@/payload-types';
import { GenerateDescription } from 'node_modules/@payloadcms/plugin-seo/dist/types';
import { lexicalToText } from './lexicalToText';
import { truncateText } from './truncateText';

export const generateDescription: GenerateDescription = async ({ doc, collectionConfig, req }) => {
  switch (collectionConfig?.slug) {
    case 'gallery-albums':
    case 'gallery-images':
    case 'posts':
    case 'pages': {
      if (doc?.content) {
        return truncateText(lexicalToText(doc?.content));
      } else {
        return '';
      }
    }
    case 'models': {
      const kit = await req.payload.findByID({
        collection: 'kits',
        id: doc?.model_meta?.kit,
      });

      console.log(kit);

      if (kit) {
        return `Released in ${kit.year_released}, follow along as I build the ${kit.title} in ${(kit.scale as Scale).title}th scale, by ${(kit.manufacturer as Manufacturer).title}.`;
      } else {
        return '';
      }
      break;
    }

    default: {
      return 'Default description, i need implemented';
    }
  }
};
