'use client';

import React from 'react';

export const AnalyticsSkeleton: React.FC = () => {
  return (
    <div className="analytics">
      <div className="analytics__header">
        <div className="skeleton skeleton--text skeleton--title"></div>
        <div className="skeleton skeleton--text skeleton--link"></div>
      </div>

      <div className="analytics__stats">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat">
            <div className="skeleton skeleton--icon"></div>
            <div className="stat__content">
              <div className="skeleton skeleton--text skeleton--value"></div>
              <div className="skeleton skeleton--text skeleton--label"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
