/** Sliding window: each refresh extends the session to this long from "now". */
export const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Minimum time between session extensions. When get-session runs after this
 * interval, Better Auth pushes expiresAt forward by SESSION_EXPIRES_IN_SECONDS.
 */
export const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24; // 1 day
