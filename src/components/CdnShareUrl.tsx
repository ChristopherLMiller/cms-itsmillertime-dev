'use client';

import React, { useMemo } from 'react';
import { CopyToClipboard, FieldLabel, useDocumentInfo, useField } from '@payloadcms/ui';
import { toCdnShareUrl } from '@/utilities/cdnShareUrl';
import styles from './CdnShareUrl.module.css';

export const CdnShareUrl: React.FC = () => {
  const { collectionSlug } = useDocumentInfo();
  const { value: filename } = useField<string | null | undefined>({ path: 'filename' });
  const { value: fileUrl } = useField<string | null | undefined>({ path: 'url' });
  const { value: prefix } = useField<string | null | undefined>({ path: 'prefix' });

  const slug = typeof collectionSlug === 'string' ? collectionSlug : undefined;
  const shareUrl = useMemo(
    () => toCdnShareUrl(slug, fileUrl, filename, prefix),
    [slug, fileUrl, filename, prefix],
  );

  return (
    <div className={styles.field}>
      <FieldLabel label="CDN URL" />
      {shareUrl ? (
        <>
          <div className={styles.row}>
            <a className={styles.url} href={shareUrl} rel="noreferrer" target="_blank">
              {shareUrl}
            </a>
            <span className={styles.copy}>
              <CopyToClipboard value={shareUrl} />
            </span>
          </div>
          <p className={styles.hint}>Cloudflare-cached share URL for this file.</p>
        </>
      ) : (
        <p className={styles.empty}>Upload a file to get a share URL.</p>
      )}
    </div>
  );
};
