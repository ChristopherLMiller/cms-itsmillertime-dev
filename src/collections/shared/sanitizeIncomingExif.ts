import type { CollectionBeforeChangeHook } from 'payload';
import { sanitizeExifForStorage } from '@/utilities/sanitizeExif';

/** REST/admin creates can send EXIF with IPTC null bytes that Postgres JSON rejects. */
export const sanitizeIncomingExif: CollectionBeforeChangeHook = ({ data }) => {
  if (!data || data.exif == null) return data;
  data.exif = sanitizeExifForStorage(data.exif);
  return data;
};
