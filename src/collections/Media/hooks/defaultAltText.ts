import type { CollectionBeforeValidateHook } from 'payload';

export const defaultAltText: CollectionBeforeValidateHook = async ({ data }) => {
  // If alt text is not provided and we have a filename, use the filename
  if (!data?.alt && data?.filename) {
    // Remove file extension and clean up the filename
    const filenameWithoutExt = data.filename.replace(/\.[^/.]+$/, '');
    // Replace hyphens, underscores, and other common separators with spaces
    const cleanedName = filenameWithoutExt
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    data.alt = cleanedName;
  }

  return data;
};
