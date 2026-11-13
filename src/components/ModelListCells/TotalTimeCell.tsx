'use client';

import { formatHuman } from '@/lib/duration';
import type { DefaultCellComponentProps } from 'payload';

/** Models list: `timeTracking.totalSeconds` as `49h 23m 12s`. */
export function TotalTimeCell({ rowData }: DefaultCellComponentProps) {
  const seconds = Number(rowData?.timeTracking?.totalSeconds ?? 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return <span>—</span>;
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatHuman(seconds)}</span>;
}
