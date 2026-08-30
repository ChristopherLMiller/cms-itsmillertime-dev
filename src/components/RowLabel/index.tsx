'use client';

import { useRowLabel } from '@payloadcms/ui';

export const RowLabel = ({ showRowNumber }: { showRowNumber?: boolean }) => {
  const { data, rowNumber } = useRowLabel<{ title?: string; label?: string }>();
  const name = [data.title, data.label].find((v) => typeof v === 'string' && v.trim());
  return (
    <div>
      {name}
      {showRowNumber && rowNumber}
    </div>
  );
};
