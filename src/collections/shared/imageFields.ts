import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import type { Field } from 'payload';

// Shared image metadata fields (alt, caption, etc.)
export const imageContentFields: Field[] = [
  {
    name: 'alt',
    type: 'text',
    required: true,
  },
  {
    name: 'caption',
    type: 'richText',
    editor: lexicalEditor({
      features: ({ rootFeatures }) => {
        return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()];
      },
    }),
  },
];

// Shared image technical fields (exif, blurhash, etc.)
export const imageTechnicalFields: Field[] = [
  {
    name: 'exif',
    type: 'json',
    admin: {
      position: 'sidebar',
      readOnly: true,
      components: {
        Field: {
          path: '@/components/EXIFDisplay#EXIFDisplay',
        },
        Cell: {
          path: '@/components/EXIFCell#EXIFCell',
        },
      },
    },
  },
  {
    name: 'blurhash',
    type: 'text',
    admin: {
      position: 'sidebar',
      disableListColumn: true,
      disableListFilter: true,
      components: {
        Field: {
          path: '@/components/BlurhashField#BlurhashField',
        },
      },
    },
  },
];
