import ExifReader from 'exifreader';

import { CollectionBeforeChangeHook } from 'payload';

const exifSupportedMimeTypes = [
  'image/jpeg',
  'image/tiff',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/webp',
];

export const generateEXIF: CollectionBeforeChangeHook = async ({ req, data }) => {
  // Start a timer to track how long it takes to generate the EXIF data
  const startTime = Date.now();
  if (data.exif && data.exif !== null && data.exif !== undefined) {
    return data;
  }

  // Check if we have an uploaded file
  console.log(req?.file);
  if (req?.file) {
    try {
      const uploadedFile = req.file;

      console.log(uploadedFile.mimetype);

      // Verify that this is an image that might have EXIF data
      if (
        !uploadedFile.mimetype ||
        !uploadedFile.mimetype.startsWith('image/') ||
        !exifSupportedMimeTypes.includes(uploadedFile.mimetype)
      ) {
        return data;
      }

      console.log('File is an image that might have EXIF data');

      // Access the file buffer directly
      const buffer = uploadedFile.data;
      const exif = await ExifReader.load(buffer, { async: true, expanded: true });

      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`EXIF data generated in ${duration}ms`);

      return {
        ...data,
        exif: exif || null,
      };
    } catch (error) {
      console.error('Error extracting EXIF data:', error);
      return data;
    }
  }

  return data;
};
