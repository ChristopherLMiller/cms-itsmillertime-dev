'use client';

import React from 'react';

interface EXIFCellProps {
  cellData?: unknown;
  data?: unknown;
  field?: { name: string };
  rowData?: Record<string, unknown>;
  [key: string]: unknown; // Allow any other props
}

// Helper function to check if EXIF data is full or reduced
const isFullEXIF = (exifData: unknown): boolean => {
  if (!exifData || typeof exifData !== 'object') {
    return false;
  }

  const data = exifData as Record<string, unknown>;

  // Check for presence of xmp section (strong indicator of full EXIF)
  if (!data.xmp || typeof data.xmp !== 'object') {
    return false;
  }

  // Check for key EXIF fields that indicate full data
  const exif = data.exif;
  if (!exif || typeof exif !== 'object') {
    return false;
  }

  const exifObj = exif as Record<string, unknown>;
  const hasMake = 'Make' in exifObj;
  const hasModel = 'Model' in exifObj;
  const hasFNumber = 'FNumber' in exifObj;
  const hasExposureTime = 'ExposureTime' in exifObj;

  // Full EXIF should have at least some of these key fields
  return hasMake || hasModel || hasFNumber || hasExposureTime;
};

export const EXIFCell: React.FC<EXIFCellProps> = (props) => {
  const exifData = props.cellData ?? props.data ?? props.rowData?.exif;

  // Check if EXIF data is undefined or null
  if (exifData === undefined || exifData === null) {
    return <span>Not generated</span>;
  }

  // Check if it's an empty object
  if (typeof exifData === 'object' && Object.keys(exifData).length === 0) {
    return <span>No</span>;
  }

  // Check if it's full or reduced EXIF
  if (isFullEXIF(exifData)) {
    return <span>Full EXIF</span>;
  } else {
    return <span>Partial EXIF</span>;
  }
};
