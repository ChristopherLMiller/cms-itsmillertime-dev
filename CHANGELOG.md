# cms-itsmillertime-dev

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
