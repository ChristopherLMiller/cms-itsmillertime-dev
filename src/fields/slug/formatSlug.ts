import type { FieldHook } from 'payload';
import slugify from 'slugify';

export const formatSlug = (val: string): string =>
  slugify(val.replace(/\//g, '-'), { lower: true });

export const formatSlugHook =
  (fallback: string): FieldHook =>
  ({ data, operation, value }) => {
    if (typeof value === 'string') {
      return formatSlug(value);
    }

    if (operation === 'create' || !data?.slug) {
      const fallbackData = data?.[fallback] || data?.[fallback];

      if (fallbackData && typeof fallbackData === 'string') {
        return formatSlug(fallbackData);
      }
    }

    return value;
  };
