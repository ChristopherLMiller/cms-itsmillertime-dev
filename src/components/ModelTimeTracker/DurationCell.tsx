'use client';

import { formatClock } from '@/lib/duration';
import type { DefaultCellComponentProps } from 'payload';

export function DurationCell({ cellData }: DefaultCellComponentProps) {
  if (cellData == null || cellData === '') return <span>Running…</span>;
  return <span>{formatClock(Number(cellData))}</span>;
}
