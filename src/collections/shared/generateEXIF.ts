import ExifReader from 'exifreader';

import { CollectionAfterChangeHook } from 'payload';

const exifSupportedMimeTypes = [
  'image/jpeg',
  'image/tiff',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/webp',
];

export const generateEXIF: CollectionAfterChangeHook = async ({ req, doc, collection }) => {
  if (doc.mimeType && doc.mimeType.includes('image/')) {
    console.log(
      `Submitting ${collection.labels.singular} to queue for EXIF generation - ${doc.filename} ${doc.id}`,
    );
    const job = await req.payload.jobs.queue({
      task: 'generateImageEXIF',
      queue: 'exif',
      input: {
        id: doc.id,
        collection: collection.slug,
      },
    });
    req.payload.jobs.runByID({ id: job.id });
  }

  return doc;
};
