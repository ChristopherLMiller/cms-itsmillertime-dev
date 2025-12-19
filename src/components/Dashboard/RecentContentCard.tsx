'use client';

import React from 'react';
import Link from 'next/link';
import { formatRelative } from 'date-fns';
import * as LucideIcons from 'lucide-react';

interface RecentContentCardProps {
  title: string;
  items: any[];
  collectionSlug: string;
  icon: string;
}

export const RecentContentCard: React.FC<RecentContentCardProps> = ({
  title,
  items,
  collectionSlug,
  icon,
}) => {
  const iconName = icon
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.FileText;

  const getItemTitle = (item: any): string => {
    return item.title || item.alt || item.name || `Item ${item.id}`;
  };

  const getItemDate = (item: any): string => {
    const date = item.updatedAt || item.createdAt;
    if (!date) return '';
    try {
      return formatRelative(new Date(date), new Date());
    } catch {
      return '';
    }
  };

  const getItemImage = (item: any): string | null => {
    // For media collection items
    if (item.url) {
      return item.url;
    }

    // For items with meta.image (posts, models, albums)
    if (item.meta?.image && typeof item.meta.image === 'object') {
      return item.meta.image.url || null;
    }

    // For models with featuredImage
    if (item.model_meta?.featuredImage && typeof item.model_meta.featuredImage === 'object') {
      return item.model_meta.featuredImage.url || null;
    }

    return null;
  };

  return (
    <div className="recent-content">
      <div className="recent-content__header">
        <IconComponent size={16} className="recent-content__icon" />
        <h3 className="recent-content__title">{title}</h3>
      </div>

      {items.length === 0 ? (
        <div className="recent-content__empty">No items yet</div>
      ) : (
        <ul className="recent-content__list">
          {items.map((item) => {
            const imageUrl = getItemImage(item);
            return (
              <li key={item.id} className="recent-content__item">
                <Link href={`/admin/collections/${collectionSlug}/${item.id}`} className="recent-content__link">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt=""
                      className="recent-content__item-thumb"
                    />
                  )}
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
        <Link href={`/admin/collections/${collectionSlug}`} className="recent-content__view-all">
          View all →
        </Link>
      </div>
    </div>
  );
};
