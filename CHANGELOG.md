# cms-itsmillertime-dev

## 3.32.0

### Minor Changes

- Raise the multipart request cap to 5GB so large uploads still work under Payload 3.90
- Queue EXIF generation through `jobs.queue()` instead of payload-jobs CRUD

### Patch Changes

- Upgrade Payload to 3.90.1 for the security release
- Restore admin job reads after Payload 3.89 access defaults
- Additive `_objectkey` migration for media, gallery-images, and gallery-masters
- Bump `payload-plugin-google-photos` to 1.0.6

## 3.31.0

### Minor Changes

- Add Google Photos import via `payload-plugin-google-photos`
- Document webhook SSE stream, API key auth, and Google Photos env vars in README

### Patch Changes

- Use default webhook stream auth (`req.payload.auth`) instead of a custom `apikeys` lookup
- Disable Better Auth API key rate limiting to avoid `incrementOne` contention under concurrent `x-api-key` traffic
- Fix gardens sidebar icon slug (`gardens`, not `gardenss`)

## 3.30.0

### Minor Changes

- Add first-publish social announce with a Social Destinations global and announce drawer
- Support posting to Discord, Slack, Reddit, X, Bluesky, Mastodon, Facebook, Instagram, LinkedIn, Threads, Telegram, Tumblr, Pinterest, and custom webhooks
- Additive migration for announce tracking on articles, models, and public gallery albums

## 3.24.1

### Patch Changes

- Build Authentik `redirect_uri` from the browser host so www login returns to www instead of cms

## 3.24.0

### Minor Changes

- Add Cloudflare CDN share URLs to media and gallery-image editors

## 3.23.0

### Minor Changes

- Add Authentik OIDC login via Better Auth (genericOAuth), with local email/password as break-glass
- Remove GitHub and Discord social providers
- Auto-provision users on first Authentik login as role `user`
- Disable public email signup

## 3.18.0

### Minor Changes

- Add gallery image tracking endpoint for anonymous lightbox engagement updates
- Show deployed CMS version in the admin sidebar

## 3.10.0

### Minor Changes

- ae7d319: Add Projects collection for portfolio management
  - New Projects collection with status tracking, categories, and technologies
  - Project links support (GitHub, Live Site, NPM, Documentation, Custom)
  - Gallery/screenshots support for project images
  - Related resources linking (posts and other projects)
  - BGG (Board Game Geek) integration with user profile field and collection API
  - Analytics dashboard with Plausible integration
  - Navigation API routes with pinning and reordering
  - EXIF display and Blurhash field components
  - Shared image upload configuration and hooks

## 3.7.0

### Minor Changes

- e499b47: Add analytics dashboard with Plausible integration for viewing site statistics and recent content

### Patch Changes

- ce49a4b: Fix Sentry package version mismatch by downgrading @sentry/nextjs to 8.55.0
- Bug fixes and improvements to EXIF handling and type safety

## 3.6.1

### Patch Changes

- a72a794: Improve EXIF generation job queue and error handling
  - Add type safety improvements to model operations
  - Enhance lexicalToText utility with better error handling and null safety
  - Work on job queue functionality for EXIF generation

- 6cdfd04: Remove serverURL for now, fixes the redirect loop
- 6cdfd04: Remove PG from the config
