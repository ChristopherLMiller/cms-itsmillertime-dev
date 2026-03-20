# cms-itsmillertime-dev

The headless CMS powering [itsmillertime.dev](https://www.itsmillertime.dev), built with [Payload CMS 3](https://payloadcms.com/) and [Next.js](https://nextjs.org/).

## Tech Stack

- **CMS**: Payload CMS 3.75
- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL (via `@payloadcms/db-postgres`)
- **Cache / KV**: Redis (via `@payloadcms/kv-redis`)
- **Object Storage**: Cloudflare R2 (via `@payloadcms/storage-s3`)
- **Email**: Resend
- **Error Tracking**: Sentry
- **Analytics**: Plausible (self-hosted)
- **Package Manager**: pnpm
- **Rich Text**: Lexical editor

## Collections

| Group | Collections |
|---|---|
| **Blog** | Posts, Categories, Tags |
| **Pages** | Pages |
| **Projects** | Projects, Categories, Technologies |
| **Galleries** | Albums, Images, Categories, Tags |
| **Models** | Models, Kits, Manufacturers, Scales, Tags |
| **Media Library** | Media |
| **Other** | Map Markers, Gardens |
| **Auth** | Users, Roles |

### Globals

- **Site Meta** -- per-path metadata (title, description)
- **Site Navigation** -- navigation structure

## Plugins

| Plugin | Purpose |
|---|---|
| `@payloadcms/plugin-seo` | SEO metadata generation |
| `@payloadcms/plugin-search` | Full-text search across posts, pages, models, and gardens |
| `@payloadcms/plugin-sentry` | Error reporting to Sentry |
| `@payloadcms/plugin-mcp` | MCP server integration |
| `@payloadcms/storage-s3` | Cloudflare R2 file storage |
| `payload-plugin-webhooks` | Webhook delivery on collection events |
| `payload-sidebar-plugin` | Custom admin sidebar with grouped navigation and icons |
| `@veiag/payload-cmdk` | Command palette (Cmd+K) in the admin panel |

## Custom Features

- **RBAC Access Control** -- role-based access with visibility and NSFW filters
- **EXIF Extraction** -- background job queue that parses EXIF data from uploaded images using ExifReader
- **BlurHash Generation** -- generates placeholder blurhash strings for images
- **Word Count** -- automatic word count tracking on posts
- **Slug Field** -- auto-generated URL slugs from titles
- **Health Endpoint** -- `GET /api/health` returns service and database status
- **Contact Form** -- `POST /api/contact-form` queues submissions on the `email` job queue; `sendContactFormEmail` renders `emails/contact-form.tsx` via React Email and sends with Resend (requires `CONTACT_EMAIL` and `RESEND_API_KEY`)
- **Custom Dashboard** -- analytics dashboard with Plausible integration
- **BGG Integration** -- Board Game Geek collection viewer in the admin panel
- **Clockify Integration** -- project time tracking via Clockify API

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL
- Redis

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URI=postgresql://user:password@localhost:5432/payload

# Payload
PAYLOAD_SECRET=your-secret-here
NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# Redis
REDIS_URL=redis://localhost:6379

# Cloudflare R2
CLOUDFLARE_BUCKET=your-bucket
CLOUDFLARE_ENDPOINT=https://your-account.r2.cloudflarestorage.com
CLOUDFLARE_ACCESS_KEY=your-access-key
CLOUDFLARE_SECRET_KEY=your-secret-key
CLOUDFLARE_REGION=auto

# Email
RESEND_API_KEY=your-resend-key
# Inbound address for www contact form (see docs on the frontend repo)
CONTACT_EMAIL=you@example.com

# Sentry
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

This starts the Next.js dev server with Turbopack at [http://localhost:3000](http://localhost:3000). The root URL redirects to `/admin`.

If you run into issues with cached state, use:

```bash
pnpm devsafe
```

This clears the `.next` directory before starting.

### Build

```bash
pnpm build
```

### Generate Types

```bash
pnpm generate:types
```

## Docker

A multi-stage `Dockerfile` is included for production deployments:

```bash
docker build -t cms-itsmillertime .
docker run -p 3000:3000 --env-file .env cms-itsmillertime
```

A `docker-compose.yml` is also available for local development with MongoDB (legacy configuration).

## Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and release management.

1. **Add a changeset** when making changes:

   ```bash
   pnpm changeset
   ```

2. **Develop on `dev`** -- push changes and open a PR to `main`.

3. **Merge to `main`** -- the GitHub Actions [release workflow](.github/workflows/release.yml) runs automatically and creates a "Version Packages" PR via Changesets.

4. **Merge the version PR** -- this bumps versions and updates the changelog.

## Project Structure

```
src/
  access/          # RBAC access control filters
  app/             # Next.js App Router (admin UI, API routes)
  collections/     # Payload collection definitions
  components/      # Custom admin UI components
  fields/          # Reusable field configurations
  endpoints/       # Custom Payload API routes (e.g. contact form)
  globals/         # Payload global definitions
  lib/             # Utility libraries (BGG, Clockify, Plausible)
  plugins/         # Payload plugin configuration
  types/           # TypeScript type definitions
  utilities/       # Helper functions (SEO generation, text processing)
```

## License

MIT
