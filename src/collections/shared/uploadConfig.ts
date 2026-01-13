import type { CollectionConfig, UploadConfig } from 'payload';

// Shared upload configuration for image sizing
export const sharedImageSizes: NonNullable<Extract<CollectionConfig['upload'], object>>['imageSizes'] = [
  {
    name: 'thumbnail',
    width: 300,
    formatOptions: {
      format: 'jpg',
      options: {
        quality: 80,
      },
    },
  },
  {
    name: 'square',
    width: 500,
    height: 500,
  },
  {
    name: 'small',
    width: 600,
    formatOptions: {
      format: 'avif',
      options: {
        quality: 65,
        effort: 3,
      },
    },
  },
  {
    name: 'medium',
    width: 900,
    formatOptions: {
      format: 'avif',
      options: {
        quality: 70,
        effort: 3,
      },
    },
  },
  {
    name: 'large',
    width: 1400,
    formatOptions: {
      format: 'avif',
      options: {
        quality: 75,
        effort: 4,
      },
    },
  },
  {
    name: 'xlarge',
    width: 1920,
    formatOptions: {
      format: 'avif',
      options: {
        quality: 80,
        effort: 4,
      },
    },
  },
  {
    name: 'og',
    width: 1200,
    height: 630,
    crop: 'center',
    formatOptions: {
      format: 'jpg',
      options: {
        quality: 85,
      },
    },
  },
];

// Base upload config that both collections can extend
export const baseUploadConfig: Extract<CollectionConfig['upload'], object> = {
  disableLocalStorage: true,
  adminThumbnail: 'thumbnail',
  cacheTags: true,
  focalPoint: true,
  displayPreview: true,
  withMetadata: true,
  pasteURL: undefined,
  imageSizes: sharedImageSizes,
};
