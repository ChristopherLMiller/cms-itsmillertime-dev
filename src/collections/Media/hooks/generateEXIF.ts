import exifParser from 'exif-parser';
import { CollectionBeforeChangeHook } from 'payload';

export const generateEXIF: CollectionBeforeChangeHook = async ({ req, data }) => {
  // Check if we have an uploaded file
  if (req?.file) {
    try {
      const uploadedFile = req.file;

      // Verify that this is an image that might have EXIF data
      if (!uploadedFile.mimetype || !uploadedFile.mimetype.startsWith('image/')) {
        return data;
      }

      // Access the file buffer directly
      const buffer = uploadedFile.data;

      const parser = exifParser.create(buffer);
      const result = parser.parse();

      return {
        ...data,
        exif: result,
      };
    } catch (error) {
      console.error('Error extracting EXIF data:', error);
      return data;
    }
  }

  return data;
};
