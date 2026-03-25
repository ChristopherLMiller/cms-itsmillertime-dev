'use client';

import React, { useMemo, useState } from 'react';
import { Activity, Clock, Eye, MousePointerClick, TrendingUp, Users } from 'lucide-react';

type AnalyticsStats = {
  visitors: number;
  pageviews: number;
  bounce_rate?: number;
  visit_duration?: number;
};

type BreakdownRow = {
  name: string;
  visitors: number;
  pageviews: number;
};

type RangeKey = '1d' | '7d' | '30d';

type RangeData = {
  label: string;
  stats: AnalyticsStats;
  topPages: BreakdownRow[];
  topReferrers: BreakdownRow[];
  topCountries: BreakdownRow[];
};

type AnalyticsWidgetClientProps = {
  ranges: Record<RangeKey, RangeData>;
};

const formatNumber = (num: number): string => new Intl.NumberFormat('en-US').format(num);

const formatDuration = (seconds?: number): string => {
  if (!seconds) return 'N/A';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}m ${secs}s`;
};

function TopList({
  title,
  items,
}: {
  title: string;
  items: BreakdownRow[];
}) {
  return (
    <div className="analytics__list-card">
      <h3 className="analytics__list-title">{title}</h3>
      {items.length === 0 ? (
        <div className="analytics__empty">No data</div>
      ) : (
        <ol className="analytics__list">
          {items.map((item) => {
            const normalizedName =
              item.name === '(direct)' || item.name === '(none)' || item.name === ''
                ? 'Direct / Unknown'
                : item.name;

            return (
              <li key={`${title}-${normalizedName}`} className="analytics__list-item">
                <div className="analytics__list-name">{normalizedName}</div>
              <div className="analytics__list-metrics">
                <span>{formatNumber(item.visitors)} visitors</span>
                <span>{formatNumber(item.pageviews)} views</span>
              </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export default function AnalyticsWidgetClient({ ranges }: AnalyticsWidgetClientProps) {
  const [activeRange, setActiveRange] = useState<RangeKey>('30d');
  const current = ranges[activeRange];

  const derived = useMemo(() => {
    const pagesPerVisitor =
      current.stats.visitors > 0 ? current.stats.pageviews / current.stats.visitors : 0;
    const bounceRate = current.stats.bounce_rate ?? 0;
    const engagedSessions = Math.max(
      Math.round(current.stats.visitors * (1 - Math.min(Math.max(bounceRate, 0), 100) / 100)),
      0,
    );

    return {
      pagesPerVisitor,
      engagedSessions,
    };
  }, [current]);

  return (
    <>
      <div className="analytics__tabs">
        {(['1d', '7d', '30d'] as RangeKey[]).map((range) => (
          <button
            key={range}
            type="button"
            className={`analytics__tab ${activeRange === range ? 'is-active' : ''}`}
            onClick={() => setActiveRange(range)}
          >
            {ranges[range].label}
          </button>
        ))}
      </div>

      <div className="analytics__stats">
        <div className="stat">
          <Eye className="stat__icon" size={20} />
          <div className="stat__content">
            <div className="stat__value">{formatNumber(current.stats.visitors)}</div>
            <div className="stat__label">Visitors</div>
          </div>
        </div>
        <div className="stat">
          <MousePointerClick className="stat__icon" size={20} />
          <div className="stat__content">
            <div className="stat__value">{formatNumber(current.stats.pageviews)}</div>
            <div className="stat__label">Pageviews</div>
          </div>
        </div>
        {current.stats.bounce_rate !== undefined && (
          <div className="stat">
            <TrendingUp className="stat__icon" size={20} />
            <div className="stat__content">
              <div className="stat__value">{current.stats.bounce_rate.toFixed(0)}%</div>
              <div className="stat__label">Bounce Rate</div>
            </div>
          </div>
        )}
        {current.stats.visit_duration !== undefined && (
          <div className="stat">
            <Clock className="stat__icon" size={20} />
            <div className="stat__content">
              <div className="stat__value">{formatDuration(current.stats.visit_duration)}</div>
              <div className="stat__label">Avg. Duration</div>
            </div>
          </div>
        )}
        <div className="stat">
          <Activity className="stat__icon" size={20} />
          <div className="stat__content">
            <div className="stat__value">{derived.pagesPerVisitor.toFixed(2)}</div>
            <div className="stat__label">Pages / Visitor</div>
          </div>
        </div>
        <div className="stat">
          <Users className="stat__icon" size={20} />
          <div className="stat__content">
            <div className="stat__value">{formatNumber(derived.engagedSessions)}</div>
            <div className="stat__label">Estimated Engaged Sessions</div>
          </div>
        </div>
      </div>

      <div className="analytics__lists">
        <TopList title="Top Pages" items={current.topPages} />
        <TopList title="Top Referrers" items={current.topReferrers} />
        <TopList title="Top Countries" items={current.topCountries} />
      </div>
    </>
  );
}
