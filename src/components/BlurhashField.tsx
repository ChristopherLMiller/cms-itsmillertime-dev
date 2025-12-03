'use client';

import React from 'react';
import { useField } from '@payloadcms/ui';

export const BlurhashField: React.FC = () => {
  const { value } = useField<string>();

  return (
    <div>
      <h3 className="field-group__title" style={{ marginBottom: '0.5rem' }}>
        Blurhash
      </h3>
      <div className="field-description" style={{ marginBottom: '0.5rem' }}>
        A blurhash is a hash of the image that can be used to display a preview of the image.
      </div>
      <div
        style={{
          width: '100%',
          aspectRatio: '3 / 2',
          border: '1px solid var(--theme-border-color)',
          borderRadius: 'var(--theme-border-radius)',
          overflow: 'hidden',
        }}
      >
        {value ? (
          <img
            src={value}
            alt="Blurhash preview"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(10px)',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--theme-elevation-50)',
              color: 'var(--theme-elevation-400)',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p style={{ margin: 0, fontSize: '0.875rem', fontStyle: 'italic' }}>
              No blurhash generated
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
