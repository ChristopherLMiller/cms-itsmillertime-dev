'use client';

import { useRowLabel } from '@payloadcms/ui';

export const RowLabel = ({ showRowNumber }: { showRowNumber?: boolean }) => {
  const { data, rowNumber } = useRowLabel<{
    title?: string;
    label?: string;
    type?: string;
  }>();
  const name = [data.label, data.title].find((v) => typeof v === 'string' && v.trim());
  const type = typeof data.type === 'string' && data.type.trim() ? data.type.trim() : null;
  return (
    <div>
      {name}
      {type ? ` (${type})` : ''}
      {showRowNumber && rowNumber}
    </div>
  );
};
