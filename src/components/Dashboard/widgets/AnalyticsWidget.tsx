import React from 'react';
import type { WidgetServerProps } from 'payload';
import type { PlausibleBreakdownRow, PlausibleStats } from '@/lib/plausible';
import { Plausible } from '@/lib/plausible';
import AnalyticsWidgetClient from './AnalyticsWidgetClient';
import '../dashboard.scss';

type AnalyticsRangeData = {
  label: string;
  stats: PlausibleStats;
  topPages: PlausibleBreakdownRow[];
  topReferrers: PlausibleBreakdownRow[];
  topCountries: PlausibleBreakdownRow[];
};

export default async function AnalyticsWidget(_: WidgetServerProps) {
  const fallbackStats: PlausibleStats = { visitors: 0, pageviews: 0 };
  const fallbackRange = {
    topPages: [],
    topReferrers: [],
    topCountries: [],
  };

  const ranges: Record<'1d' | '7d' | '30d', AnalyticsRangeData> = {
    '1d': {
      label: 'Today',
      stats: fallbackStats,
      ...fallbackRange,
    },
    '7d': {
      label: 'Last 7 Days',
      stats: fallbackStats,
      ...fallbackRange,
    },
    '30d': {
      label: 'Last 30 Days',
      stats: fallbackStats,
      ...fallbackRange,
    },
  };

  try {
    const plausible = new Plausible();
    const dateRanges: Array<'1d' | '7d' | '30d'> = ['1d', '7d', '30d'];

    await Promise.all(
      dateRanges.map(async (range) => {
        const [stats, topPages, topReferrers, topCountries] = await Promise.allSettled([
          plausible.getStats(range),
          plausible.getTopPages(range, 5),
          plausible.getTopReferrers(range, 5),
          plausible.getTopCountries(range, 5),
        ]);

        ranges[range] = {
          ...ranges[range],
          stats: stats.status === 'fulfilled' ? stats.value : fallbackStats,
          topPages: topPages.status === 'fulfilled' ? topPages.value : [],
          topReferrers: topReferrers.status === 'fulfilled' ? topReferrers.value : [],
          topCountries: topCountries.status === 'fulfilled' ? topCountries.value : [],
        };
      }),
    );
  } catch (error) {
    console.error('Failed to fetch Plausible stats for dashboard widget:', error);
  }

  return (
    <div className="analytics">
      <div className="analytics__header">
        <h2 className="analytics__title">Site Analytics</h2>
        <a
          href="https://plausible.itsmillertime.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="analytics__link"
        >
          View Details →
        </a>
      </div>
      <AnalyticsWidgetClient ranges={ranges} />
    </div>
  );
}
