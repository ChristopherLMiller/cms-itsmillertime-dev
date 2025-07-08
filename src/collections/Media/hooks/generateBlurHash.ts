import { CollectionBeforeValidateHook } from 'payload';
import { getPlaiceholder } from 'plaiceholder';

export const generateBlurHash: CollectionBeforeValidateHook = async ({ req, data, operation }) => {
  if (operation === 'create' || operation === 'update' || data.blurhash !== null) {
    try {
      const uploadedFile = req.file;

      // Verify we have an uploaded file
      if (!uploadedFile) {
        return data;
      }
      // Verify its an image
      if (!uploadedFile.mimetype || !uploadedFile.mimetype.startsWith('image/')) {
        return data;
      }

      const buffer = uploadedFile.data;

      if (buffer) {
        const { base64 } = await getPlaiceholder(buffer, { size: 32 });

        return {
          ...data,
          blurhash: base64,
        };
      }
    } catch (error) {
      console.error('Error generating blurhash:', error);
      return data;
    }
  }
  return data;
};
