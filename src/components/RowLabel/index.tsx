'use client';

import { useRowLabel } from '@payloadcms/ui';

export const RowLabel = ({ showRowNumber }: { showRowNumber?: boolean }) => {
  const { data, rowNumber } = useRowLabel<{ title?: string }>();
  return (
    <div>
      {data.title}
      {showRowNumber && rowNumber}
    </div>
  );
};
