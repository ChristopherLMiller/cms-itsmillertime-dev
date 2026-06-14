import React from 'react';
import type { WidgetServerProps } from 'payload';
import packageJson from '../../../../package.json';
import '../dashboard.scss';

export default function DeployVersionWidget(_: WidgetServerProps) {
  return (
    <div className="deploy-version-widget">
      <div className="deploy-version-widget__content">
        <span className="deploy-version-widget__label">Deployed CMS version</span>
        <span className="deploy-version-widget__value">v{packageJson.version}</span>
      </div>
      <p className="deploy-version-widget__hint">
        Matches <code>package.json</code> on this running instance — useful after deploys.
      </p>
    </div>
  );
}
