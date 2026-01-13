import { Media, Model } from '@/payload-types';
import { GenerateImage } from 'node_modules/@payloadcms/plugin-seo/dist/types';

export const generateImage: GenerateImage = async ({ req, doc, collectionConfig }) => {
  switch (collectionConfig?.slug) {
    case 'models': {
      return (doc as Model)?.model_meta?.featuredImage;
    }
    case 'gallery-albums': {
      if (doc?.images.docs.length) {
        const firstImage = await req.payload.findByID({
          collection: 'gallery-images',
          id: doc?.images.docs[0],
        });
        return firstImage.id;
      }
    }
    case 'gallery-images': {
      return doc?.id;
    }
    default: {
      console.log('Default image handler');
      return doc?.featuredImage;
    }
  }
};
