/**
 * Parse an ISO-8601 duration (as returned by Clockify, e.g. `PT123H4M5S` or
 * `P1DT2H`) into whole seconds. Returns null for anything it can't read.
 * Years/months are rejected: they have no fixed length in seconds.
 */
export function parseIsoDuration(value: string | null | undefined): number | null {
  if (typeof value !== 'string') return null;
  const match = /^P(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(
    value.trim(),
  );
  if (!match || value.trim() === 'P' || value.trim() === 'PT') return null;
  const [, weeks, days, hours, minutes, seconds] = match.map((part) => Number(part ?? 0));
  return Math.floor(weeks * 604800 + days * 86400 + hours * 3600 + minutes * 60 + seconds);
}

/** Format seconds as `h:mm:ss` (hours are not capped at 24). */
export function formatClock(totalSeconds: number | null | undefined): string {
  const s = Math.max(0, Math.floor(totalSeconds ?? 0));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Format seconds as `49h 23m 12s`, dropping leading zero units. */
export function formatHuman(totalSeconds: number | null | undefined): string {
  const s = Math.max(0, Math.floor(totalSeconds ?? 0));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
