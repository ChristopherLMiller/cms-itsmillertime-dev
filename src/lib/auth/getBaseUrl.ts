export function getBaseUrl() {
  // For vercel
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  // For production
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;

  // Local development
  return 'http://localhost:3000';
}
