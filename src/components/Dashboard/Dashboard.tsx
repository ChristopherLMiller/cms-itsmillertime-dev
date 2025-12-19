'use client';

import React, { useEffect, useState } from 'react';
import { Gutter } from '@payloadcms/ui';
import { AnalyticsCard } from './AnalyticsCard';
import { AnalyticsSkeleton } from './AnalyticsSkeleton';
import { RecentContentCard } from './RecentContentCard';
import './dashboard.scss';

interface DashboardData {
  posts: any[];
  models: any[];
  albums: any[];
  media: any[];
  analytics: {
    visitors: number;
    pageviews: number;
    bounce_rate?: number;
    visit_duration?: number;
  } | null;
}

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>({
    posts: [],
    models: [],
    albums: [],
    media: [],
    analytics: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/dashboard/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="dashboard">
      <Gutter>
        <div className="dashboard__wrap">
          <div className="dashboard__analytics">
            {loading ? (
              <AnalyticsSkeleton />
            ) : data.analytics ? (
              <AnalyticsCard stats={data.analytics} />
            ) : null}
          </div>

          <div className="dashboard__content">
            {error ? (
              <div className="dashboard__error">Failed to load content</div>
            ) : (
              <>
                <RecentContentCard
                  title="Recent Posts"
                  items={data.posts}
                  collectionSlug="posts"
                  icon="file-text"
                />
                <RecentContentCard
                  title="Recent Models"
                  items={data.models}
                  collectionSlug="models"
                  icon="plane"
                />
                <RecentContentCard
                  title="Recent Albums"
                  items={data.albums}
                  collectionSlug="gallery-albums"
                  icon="images"
                />
                <RecentContentCard
                  title="Recent Media"
                  items={data.media}
                  collectionSlug="media"
                  icon="image"
                />
              </>
            )}
          </div>
        </div>
      </Gutter>
    </div>
  );
};
