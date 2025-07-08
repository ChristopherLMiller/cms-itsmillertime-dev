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
  if (data?.exif !== null) {
    return data;
  }

  // Check if we have an uploaded file
  if (req?.file) {
    try {
      const uploadedFile = req.file;

      // Verify that this is an image that might have EXIF data
      if (
        !uploadedFile.mimetype ||
        !uploadedFile.mimetype.startsWith('image/') ||
        !exifSupportedMimeTypes.includes(uploadedFile.mimetype)
      ) {
        return data;
      }

      // Access the file buffer directly
      const buffer = uploadedFile.data;
      const exif = await ExifReader.load(buffer, { async: true, expanded: true });

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
