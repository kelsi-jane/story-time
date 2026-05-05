# Architecture

## Stack

| Layer | Technology | Tier / Cost |
|---|---|---|
| Frontend | React (Vite) | Azure Static Web Apps — free |
| API | Azure Functions | Consumption plan — first 1M req/month free |
| Auth | GitHub OAuth | Built into Azure SWA — free |
| Content + Images | Azure Blob Storage | ~$0.018/GB/month |
| Metadata | Azure Table Storage | Same storage account as blobs; ~$0.07/GB |
| CI/CD | GitHub Actions | Built into Azure SWA — free |

Estimated monthly cost: **$0–2**, driven entirely by storage volume.

## Project Structure

```
story-time/
├── src/
│   ├── web/                        # React + Vite + TypeScript
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   │   ├── reader/
│   │   │   │   │   ├── Discovery.tsx     # browse/search stories
│   │   │   │   │   ├── StoryTitle.tsx    # story cover/title page
│   │   │   │   │   └── Chapter.tsx       # chapter reading view
│   │   │   │   └── admin/
│   │   │   │       ├── Index.tsx         # story list
│   │   │   │       ├── StoryNew.tsx      # create story
│   │   │   │       ├── StoryEdit.tsx     # edit story + reorder chapters
│   │   │   │       └── ChapterNew.tsx    # upload/write chapter
│   │   │   ├── router.tsx                # React Router route definitions
│   │   │   ├── types.ts                  # shared TypeScript types (Story, Chapter, etc.)
│   │   │   └── styles/
│   │   │       └── tokens.css            # CSS variable palette
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── api/                        # Azure Functions (auto-wired by SWA)
│       ├── stories/                 # GET /api/stories, POST /api/stories
│       ├── stories-slug/            # GET /PUT /DELETE /api/stories/{slug}
│       ├── chapters/                # POST /api/chapters
│       ├── chapters-id/             # GET /PUT /DELETE /api/chapters/{id}
│       └── images/                  # POST /api/images
├── design/
│   ├── high-level.md
│   ├── architecture.md
│   └── aesthethic.md
├── staticwebapp.config.json        # SWA config (routes, auth, API location)
└── README.md
```

## Auth Flow

SWA route protection (`allowedRoles`) has been removed from `staticwebapp.config.json`. Auth is owned entirely by React via `AuthContext` and `AdminLayout`.

1. Unauthenticated user navigates to any `/admin/*` route
2. `AdminLayout` detects `user === null` → redirects to `/.auth/login/github?post_login_redirect_uri=<current path>`
3. GitHub OAuth completes → SWA redirects back to the original URL
4. `AuthContext` fetches `/.auth/me`, reads `clientPrincipal.userDetails` (GitHub username)
5. Username checked against admin whitelist (`isAdminUser`)
6. Not whitelisted → `/unauthorized`; whitelisted → admin renders with role (`isAdmin`, `isPrimary`)

**Why SWA protection was removed:** The built-in 401 override only accepts a static redirect URL, so post-login the user always landed on `/` instead of the page they came from. React ownership allows passing `window.location.pathname` as the return URL.

**Local dev:** `getAuthUser()` returns the value of `VITE_DEV_AUTH_USERNAME` from `.env.local` instead of fetching `/.auth/me`. No real session exists locally.

## Admin Whitelist

GitHub username-based. Seeded from the `VITE_INITIAL_ADMIN_USERNAMES` environment variable (comma-separated; first entry is primary). Stored in `localStorage` in the mock API — will move to Azure Table Storage when the real API is wired.

**Roles:**
- `primary` — full access including `/admin/admins` (add/remove admins, transfer primary)
- `admin` — story editing only; cannot access admin management

## Admin UI

Desktop-first; functional over polished.

| Route | Purpose |
|---|---|
| `/admin` | Story list — publish/unpublish, delete |
| `/admin/admins` | Manage admin whitelist (primary only) |
| `/admin/stories/new` | Create story + metadata (title, slug, tags, series) |
| `/admin/stories/:slug` | Edit story metadata, manage + reorder chapters |
| `/admin/stories/:slug/chapters/new` | Upload or write chapter Markdown |
| `/admin/stories/:slug/chapters/:id/edit` | Edit existing chapter title and content |

The admin UI is the only place where write operations are exposed. Reader-facing surfaces are read-only against the same API.

## Image Handling

Images are uploaded via the admin UI, constrained before write:
- Enforced aspect ratio and max dimensions at upload time
- Written to a dedicated blob container (`/images/`)
- Aesthetic guidelines (warm tones, soft contrast) are documented in the aesthetic doc — editorial, not technical enforcement

## Blob Storage Layout

```
container: content/
  stories/{storySlug}/chapters/{chapterId}.md

container: images/
  stories/{storySlug}/{imageId}.{ext}
```

## Future Considerations

- CDN in front of blob storage if load warrants it (Azure CDN or Front Door)
- Multi-author: add author identity to Table Storage entities and scope queries accordingly
