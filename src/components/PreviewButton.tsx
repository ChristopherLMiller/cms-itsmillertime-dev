'use client';

import { Button, useDocumentInfo } from '@payloadcms/ui';

type SluggableDocument = {
  slug?: string | null;
  settings?: {
    slug?: string | null;
  } | null;
};

export const PreviewButton = () => {
  const { id, collectionSlug, data } = useDocumentInfo();

  const getFrontendURL = () => {
    const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL?.replace(/\/+$/, '');

    if (!baseUrl || !collectionSlug) {
      return null;
    }

    const doc = data as SluggableDocument | undefined;
    const slugFromDoc =
      typeof doc?.slug === 'string' && doc.slug.trim().length > 0 ? doc.slug.trim() : null;
    const slugFromSettings =
      typeof doc?.settings?.slug === 'string' && doc.settings.slug.trim().length > 0
        ? doc.settings.slug.trim()
        : null;
    const slug = slugFromDoc || slugFromSettings;

    const identifier =
      slug && slug.length > 0
        ? slug
        : typeof id === 'string' || typeof id === 'number'
          ? String(id)
          : null;

    if (!identifier) {
      return null;
    }

    const pathSegments: string[] = [];
    const safeCollectionSlug = typeof collectionSlug === 'string' ? collectionSlug : '';

    switch (safeCollectionSlug) {
      case 'posts':
        pathSegments.push('articles', identifier);
        break;
      case 'pages':
        pathSegments.push(identifier);
        break;
      case 'models':
        pathSegments.push('models', identifier);
        break;
      default:
        if (safeCollectionSlug) {
          pathSegments.push(safeCollectionSlug);
        }
        pathSegments.push(identifier);
        break;
    }

    const path = pathSegments.filter(Boolean).join('/');

    return `${baseUrl}/${path}`;
  };

  const frontendURL = getFrontendURL();

  if (!frontendURL) {
    return null;
  }

  return (
    <Button el="anchor" buttonStyle="secondary" newTab url={frontendURL}>
      View on site
    </Button>
  );
};
