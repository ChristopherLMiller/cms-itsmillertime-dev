'use client';

import React from 'react';
import { Button, Pill, useDocumentInfo } from '@payloadcms/ui';
import styles from './ProductRequests.module.css';

type RequestDoc = {
  name?: string | null;
  email?: string | null;
  status?: 'pending' | 'notified' | 'cancelled' | null;
  imageTitle?: string | null;
  imageUrl?: string | null;
  albumSlug?: string | null;
  galleryImage?: number | { id?: number } | null;
};

const STATUS_PILL: Record<string, 'success' | 'warning' | 'light-gray'> = {
  pending: 'warning',
  notified: 'success',
  cancelled: 'light-gray',
};

function imageIdOf(doc: RequestDoc | undefined): number | null {
  const raw = doc?.galleryImage;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === 'object' && typeof raw.id === 'number') return raw.id;
  return null;
}

export const ProductRequestSummary: React.FC = () => {
  const { data } = useDocumentInfo();
  const doc = data as RequestDoc | undefined;
  const imageId = imageIdOf(doc);
  const title = (doc?.imageTitle ?? '').trim() || (imageId ? `Image #${imageId}` : 'Gallery image');
  const status = doc?.status ?? 'pending';

  return (
    <div className={styles.summary}>
      {doc?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.summaryThumb} src={doc.imageUrl} alt={title} />
      ) : (
        <div className={styles.summaryThumb} />
      )}
      <div className={styles.summaryMeta}>
        <div>
          <Pill pillStyle={STATUS_PILL[status] ?? 'light-gray'} size="small">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Pill>
        </div>
        <h3 className={styles.summaryTitle}>{title}</h3>
        <p className={styles.summaryLine}>
          {doc?.name || 'Someone'}
          {doc?.email ? (
            <>
              {' · '}
              <a href={`mailto:${doc.email}`}>{doc.email}</a>
            </>
          ) : null}
        </p>
        {status === 'pending' ? (
          <p className={styles.summaryHint}>
            List this image on the Store tab to email them. Changing status here does not send
            mail.
          </p>
        ) : null}
        <div className={styles.summaryActions}>
          {imageId != null && (
            <Button
              el="anchor"
              buttonStyle="primary"
              size="small"
              url={`/admin/collections/gallery-images/${imageId}`}
            >
              Open image Store tab
            </Button>
          )}
          {doc?.email && (
            <Button el="anchor" buttonStyle="secondary" size="small" url={`mailto:${doc.email}`}>
              Email requester
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
