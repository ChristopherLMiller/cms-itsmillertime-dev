import packageJson from '../../../package.json';

export default function DeployVersion() {
  return (
    <div className="deploy-version">
      <span className="deploy-version__label">Deployed</span>
      <span className="deploy-version__value">v{packageJson.version}</span>
    </div>
  );
}
