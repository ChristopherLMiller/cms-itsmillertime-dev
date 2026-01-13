import type { CollectionBeforeValidateHook, CollectionAfterChangeHook } from 'payload';
import { defaultAltText } from '@/collections/Media/hooks/defaultAltText';
import { generateBlurHash } from '@/collections/Media/hooks/generateBlurHash';

// Shared hooks for image collections
export const sharedImageBeforeValidateHooks: CollectionBeforeValidateHook[] = [
  defaultAltText,
  generateBlurHash,
];

export const sharedImageAfterChangeHook: CollectionAfterChangeHook = async ({
  req,
  doc,
  operation,
}) => {
  if (operation === 'create' || operation === 'update') {
    if (doc.mimeType && doc.mimeType.startsWith('image/')) {
      console.log(`Generating EXIF for image ${doc.id}`);
      await req.payload.jobs.queue({
        task: 'generateImageEXIF',
        queue: 'metadata',
        input: {
          imageId: doc.id,
        },
      });
    }
  }
};
