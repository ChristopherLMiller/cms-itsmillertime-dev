# cms-itsmillertime-dev

## 3.37.0

### Minor Changes

- Update `payload-plugin-webhooks` to 1.3.1. Outbound webhook endpoints, deliveries and the Event Stream global are now admin-only, and admins can set a different "Run as" user on an endpoint
- Migration `20261113_webhooks_outbound`: creates the `webhook_endpoints` / `webhook_deliveries` tables, their lock rels columns and the `deliverWebhook` job task slug. Idempotent
- Fix "Send test" on a webhook endpoint returning 400 ("The following field is invalid: Endpoint") on Postgres (plugin 1.3.1)

## 3.36.0

### Minor Changes

- Models list: the name column shows the featured image thumbnail beside the model name, and a new "Time Tracked" column shows the stored total as `49h 23m 12s`. Default columns are now name, slug, time tracked, status
- Media picker performance: Pixel Ultra HDR / Motion Photo uploads stored their embedded images in `exif.mpf.Images[].base64` (5–10 MB per record), so 50 Media rows were ~126 MB. The EXIF sanitizer now drops `base64` keys and any string over 16 KB, and the Media list and upload picker only load visible columns
- Migration `20261113_strip_exif_blobs`: strips existing EXIF blobs (`mpf.Images[].base64`, `Thumbnail`, `exif.MakerNote`) from `media` and `gallery_images`; tag values are kept. Not reversible (the stripped data isn't used)

## 3.35.1

### Patch Changes

- Models sidebar: Related Articles and Related Models now sit together under one "Related Resources" section. Display-only; stored data paths are unchanged, so no migration

## 3.35.0

### Minor Changes

- Remove the Clockify integration: `/api/clockify/*` endpoints, the Clockify API client, the `clockify_project` field and project picker, the `/api/model-time/clockify-import` and `/api/model-time/clockify-unlink` endpoints, and the sidebar Clockify migration panel
- Migration `20261113_remove_clockify`: renames time entry source `clockify-import` to `imported` (carried-over totals are kept), drops `model_time_entries.clockify_project_id`, its one-import-per-model index, and `models.clockify_project`. Destructive; Clockify project ids are not recoverable on `down`
- Model timer rules: starting a timer on a `NOT_STARTED` model moves it to `IN_PROGRESS`; `COMPLETED` models reject timer starts (409) and hide the Start button; saving a model as `COMPLETED` stops any timer running on it
- Remove the Time Entries list from the model edit page ("View all entries" in the sidebar remains)
- Hide the "Publish announce" group in the sidebar on Posts, Albums and Models (values are still kept and used by the Announce button)

## 3.34.0

### Minor Changes

- Built-in model time tracking to replace Clockify: new `model-time-entries` collection (model, start/stop, server-computed duration, source, note) with a per-model total stored on `models.timeTracking.totalSeconds`, re-summed by hooks on every entry change
- Models sidebar time tracker (live total, start/stop, link to entries), a join list of recent entries, and a Clockify migration panel that imports a project's total as a single `clockify-import` entry and only allows unlinking Clockify once that import exists
- New admin-only endpoints under `/api/model-time` (timer status, start, stop, clockify-import, clockify-unlink), documented in the OpenAPI spec. The existing `/api/clockify` endpoints stay until www is switched over
- Migration `20261112_model_time_entries`: additive; enforces one running timer and one Clockify import per model with partial unique indexes

## 3.33.0

### Minor Changes

- Security dependency update clearing all critical `pnpm audit` advisories (154 → 19 remaining, none critical)
- Upgrade Payload to 3.93.0, Next.js to 16.4.6, Better Auth to 1.7.22, and `@delmaredigital/payload-better-auth` to 0.14.2
- Migration `20261112_better_auth_1_7_3_issuer_cleanup`: drop the unique `(issuer, account_id)` index and the `NOT NULL` on `accounts.issuer`, which Better Auth 1.7.3+ no longer writes (without it, sign-ups and Authentik account links fail). Non-destructive; the column is kept

### Patch Changes

- Bump `@sentry/nextjs` to 10.78.0 (tunnel route middleware bypass)
- Bump sharp, zod, react/react-dom 19.3.1, sanitize-html, fast-xml-parser, resend, the AWS S3 client, react-email, and dev tooling
- Override `@modelcontextprotocol/sdk` to 1.32.2 (plugin-mcp pins 1.30.0), monaco-editor's dompurify to 3.4.17, and react-email preview-server's `next` to 16.4.6
- Move the `@better-auth/utils` override from 0.4.2 to 0.5.1 (required by better-call 1.4.5)
- Pin `typescript` 5.9.3 as a devDependency; it was previously an implicit peer install and would otherwise resolve to TS 6
- Copy Medusa upload bytes into an ArrayBuffer-backed view before building the Blob (strict lib typings)

## 3.32.1

### Patch Changes

- Start www Authentik login with Better Auth social sign-in

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
