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

Azure Static Web Apps has native GitHub OAuth support. The admin route is protected via SWA's built-in role system — no custom auth code required.

1. Admin navigates to `/admin`
2. SWA redirects to GitHub OAuth if not authenticated
3. On success, SWA issues a session cookie scoped to the app
4. Azure Functions receive the authenticated principal via request headers

## Admin UI

Protected by GitHub OAuth via SWA's built-in role system. Desktop-first; functional over polished.

| Route | Purpose |
|---|---|
| `/admin` | Story list — publish/unpublish, delete |
| `/admin/stories/new` | Create story + metadata (title, slug, tags, series) |
| `/admin/stories/:slug` | Edit story metadata, manage + reorder chapters |
| `/admin/stories/:slug/chapters/new` | Upload or write chapter Markdown |

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
