import React from 'react';
import Link from 'next/link';
import { formatRelative } from 'date-fns';
import * as LucideIcons from 'lucide-react';
import type { CollectionSlug, WidgetServerProps } from 'payload';
import '../dashboard.scss';

type SupportedCollection = 'posts' | 'models' | 'gallery-albums' | 'media';

type RecentWidgetData = {
  title?: string;
  collection?: SupportedCollection;
  icon?: string;
};

const DEFAULT_DATA: Required<RecentWidgetData> = {
  title: 'Recent Content',
  collection: 'posts',
  icon: 'file-text',
};

const COLLECTION_SORT: Record<SupportedCollection, string> = {
  posts: '-updatedAt',
  models: '-updatedAt',
  'gallery-albums': '-updatedAt',
  media: '-createdAt',
};

const getItemTitle = (item: Record<string, unknown>): string => {
  return (
    (typeof item.title === 'string' && item.title) ||
    (typeof item.alt === 'string' && item.alt) ||
    (typeof item.name === 'string' && item.name) ||
    (item.id ? `Item ${String(item.id)}` : 'Untitled')
  );
};

const getItemDate = (item: Record<string, unknown>): string => {
  const date = item.updatedAt ?? item.createdAt;
  if (typeof date !== 'string') return '';

  try {
    return formatRelative(new Date(date), new Date());
  } catch {
    return '';
  }
};

const getItemImage = (item: Record<string, unknown>): string | null => {
  if (typeof item.url === 'string') return item.url;

  const meta = item.meta as { image?: { url?: string } } | undefined;
  if (meta?.image && typeof meta.image.url === 'string') {
    return meta.image.url;
  }

  const modelMeta = item.model_meta as {
    featuredImage?: { url?: string };
  } | undefined;
  if (modelMeta?.featuredImage && typeof modelMeta.featuredImage.url === 'string') {
    return modelMeta.featuredImage.url;
  }

  return null;
};

type IconProps = { size?: number; className?: string };

function lucideIconFromKebab(kebab: string): React.ComponentType<IconProps> {
  const pascal = kebab
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  const byName = LucideIcons as unknown as Record<string, React.ComponentType<IconProps>>;
  return byName[pascal] ?? LucideIcons.FileText;
}

export default async function RecentContentWidget({ req, widgetData }: WidgetServerProps) {
  const configData = {
    ...DEFAULT_DATA,
    ...(widgetData as RecentWidgetData),
  };

  const IconComponent = lucideIconFromKebab(configData.icon);

  let items: Record<string, unknown>[] = [];

  try {
    const result = await req.payload.find({
      collection: configData.collection as CollectionSlug,
      limit: 5,
      sort: COLLECTION_SORT[configData.collection],
      depth: configData.collection === 'media' ? 0 : 1,
    });
    items = result.docs as unknown as Record<string, unknown>[];
  } catch (error) {
    console.error('Failed to fetch recent content for dashboard widget:', error);
  }

  return (
    <div className="card recent-content">
      <div className="recent-content__header">
        <IconComponent size={16} className="recent-content__icon" />
        <h3 className="recent-content__title">{configData.title}</h3>
      </div>

      {items.length === 0 ? (
        <div className="recent-content__empty">No items yet</div>
      ) : (
        <ul className="recent-content__list">
          {items.map((item) => {
            const imageUrl = getItemImage(item);
            const itemId = String(item.id ?? '');

            return (
              <li key={itemId} className="recent-content__item">
                <Link
                  href={`/admin/collections/${configData.collection}/${itemId}`}
                  className="recent-content__link"
                >
                  {imageUrl && <img src={imageUrl} alt="" className="recent-content__item-thumb" />}
                  <div className="recent-content__item-info">
                    <span className="recent-content__item-title">{getItemTitle(item)}</span>
                    {getItemDate(item) && (
                      <span className="recent-content__item-date">{getItemDate(item)}</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="recent-content__footer">
        <Link href={`/admin/collections/${configData.collection}`} className="recent-content__view-all">
          View all -&gt;
        </Link>
      </div>
    </div>
  );
}
