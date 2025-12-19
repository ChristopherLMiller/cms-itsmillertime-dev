'use client';

import React from 'react';
import { TrendingUp, Eye, MousePointerClick, Clock } from 'lucide-react';

interface AnalyticsCardProps {
  stats: {
    visitors: number;
    pageviews: number;
    bounce_rate?: number;
    visit_duration?: number;
  };
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ stats }) => {
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="analytics">
      <div className="analytics__header">
        <h2 className="analytics__title">Site Analytics (Last 30 Days)</h2>
        <a
          href="https://plausible.itsmillertime.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="analytics__link"
        >
          View Details →
        </a>
      </div>

      <div className="analytics__stats">
        <div className="stat">
          <Eye className="stat__icon" size={20} />
          <div className="stat__content">
            <div className="stat__value">{formatNumber(stats.visitors)}</div>
            <div className="stat__label">Visitors</div>
          </div>
        </div>

        <div className="stat">
          <MousePointerClick className="stat__icon" size={20} />
          <div className="stat__content">
            <div className="stat__value">{formatNumber(stats.pageviews)}</div>
            <div className="stat__label">Pageviews</div>
          </div>
        </div>

        {stats.bounce_rate !== undefined && (
          <div className="stat">
            <TrendingUp className="stat__icon" size={20} />
            <div className="stat__content">
              <div className="stat__value">{stats.bounce_rate.toFixed(0)}%</div>
              <div className="stat__label">Bounce Rate</div>
            </div>
          </div>
        )}

        {stats.visit_duration !== undefined && (
          <div className="stat">
            <Clock className="stat__icon" size={20} />
            <div className="stat__content">
              <div className="stat__value">{formatDuration(stats.visit_duration)}</div>
              <div className="stat__label">Avg. Duration</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
