import type { Post, Model, GalleryAlbum, Media } from '@/payload-types';

export interface DashboardStats {
  posts: Partial<Post>[];
  models: Partial<Model>[];
  albums: Partial<GalleryAlbum>[];
  media: Partial<Media>[];
  analytics: PlausibleAnalytics | null;
}

export interface PlausibleAnalytics {
  visitors: number;
  pageviews: number;
  bounce_rate?: number;
  visit_duration?: number;
}

export interface RecentItem {
  id: string | number;
  title?: string;
  alt?: string;
  name?: string;
  updatedAt?: string;
  createdAt?: string;
}
