import type { Media } from '@/payload-types';
import Link from 'next/link';
import type { DefaultServerCellComponentProps } from 'payload';
import { formatAdminURL } from 'payload/shared';
import styles from './ModelListCells.module.css';

type MediaThumb = Pick<Media, 'url' | 'thumbnailURL' | 'sizes' | 'alt'>;

/**
 * Models list: featured image thumbnail + model name in one column. The list
 * view loads docs at depth 0, so the featured image arrives as an id and is
 * looked up here (one small select per row on the current page).
 */
export async function ModelTitleCell({
  cellData,
  rowData,
  link,
  linkURL,
  payload,
  collectionSlug,
  viewType,
}: DefaultServerCellComponentProps) {
  const title = typeof cellData === 'string' && cellData ? cellData : `Model #${rowData.id}`;

  const imageRef = rowData?.model_meta?.featuredImage;
  let image: MediaThumb | null = null;
  if (imageRef && typeof imageRef === 'object') {
    image = imageRef as MediaThumb;
  } else if (imageRef != null) {
    try {
      image = (await payload.findByID({
        collection: 'media',
        id: imageRef,
        depth: 0,
        select: { url: true, thumbnailURL: true, sizes: true, alt: true },
      })) as MediaThumb;
    } catch {
      image = null;
    }
  }
  const src = image?.thumbnailURL || image?.sizes?.thumbnail?.url || image?.url || null;

  const content = (
    <span className={styles.titleCell}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.thumb} src={src} alt={image?.alt ?? ''} loading="lazy" />
      ) : (
        <span className={styles.thumbPlaceholder} aria-hidden />
      )}
      <span className={styles.title}>{title}</span>
    </span>
  );

  if (!link) return content;

  const href =
    linkURL ??
    formatAdminURL({
      adminRoute: payload.config.routes.admin,
      path: `/collections/${collectionSlug}${viewType === 'trash' ? '/trash' : ''}/${encodeURIComponent(String(rowData.id))}`,
    });
  return (
    <Link href={href} prefetch={false} className={styles.link}>
      {content}
    </Link>
  );
}
