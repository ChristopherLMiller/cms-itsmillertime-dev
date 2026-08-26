'use client';

import React from 'react';
import { Pill } from '@payloadcms/ui';
import styles from './ProductRequests.module.css';

type CellProps = {
  cellData?: unknown;
  rowData?: Record<string, unknown>;
};

const STATUS_PILL: Record<string, 'success' | 'warning' | 'light-gray'> = {
  pending: 'warning',
  notified: 'success',
  cancelled: 'light-gray',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  notified: 'Notified',
  cancelled: 'Cancelled',
};

export const HiddenOnEdit: React.FC = () => null;

export const ProductRequestImageCell: React.FC<CellProps> = ({ cellData, rowData }) => {
  const src =
    (typeof cellData === 'string' && cellData) ||
    (typeof rowData?.imageUrl === 'string' ? rowData.imageUrl : null);

  if (!src) {
    return <span className={styles.thumbFallback}>No image</span>;
  }

  return (
    <div className={styles.thumbCell}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.thumb} src={src} alt="" />
    </div>
  );
};

export const ProductRequestStatusCell: React.FC<CellProps> = ({ cellData }) => {
  const status = typeof cellData === 'string' ? cellData : '';
  return (
    <Pill pillStyle={STATUS_PILL[status] ?? 'light-gray'} size="small">
      {STATUS_LABEL[status] ?? (status || '—')}
    </Pill>
  );
};

export const ProductRequestImageLinkCell: React.FC<CellProps> = ({ cellData, rowData }) => {
  const raw = cellData ?? rowData?.galleryImage;
  const id =
    typeof raw === 'object' && raw !== null && 'id' in raw
      ? Number((raw as { id: unknown }).id)
      : Number(raw);

  if (!Number.isFinite(id)) return <span>—</span>;

  return (
    <a className={styles.openLink} href={`/admin/collections/gallery-images/${id}`}>
      Open image
    </a>
  );
};
