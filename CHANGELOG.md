# cms-itsmillertime-dev

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
