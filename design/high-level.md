# Story Time — High-Level Design

## Overview

A platform to upload, share, and read stories. Self-hostable: users can clone/fork the repo to host their own instance.

## Goals

- Single admin publishes and manages stories
- Anonymous readers browse and read stories
- Hyper-polished, mobile-first reader experience (soft pink aesthetic)
- As close to free as possible to host

## Decisions

| Topic | Decision | Notes |
|---|---|---|
| Readers | Anonymous, no accounts | No social layer for now |
| Auth | GitHub OAuth (single admin) | Built into Azure SWA; zero custom auth code |
| Story format | Markdown per chapter, stored in Azure Blob | Can pivot to richer structure later |
| Storage | Azure Blob Storage | Story content + images |
| Metadata | Azure Table Storage | Same storage account as blobs |
| Hosting | Azure Static Web Apps (free tier) | React frontend + Azure Functions API |
| Series | Implicit — `seriesSlug` + `seriesOrder` fields on story | No separate Series record needed at this scale |
| Tag-based UI | Series selected via tag-picker in admin | Slug uniqueness enforced on save |

## Data Model (Story)

```
Story
├── id
├── title
├── slug                  (unique)
├── tags[]                (genre, mood, etc.)
├── seriesSlug?           (optional; links story to a series)
├── seriesOrder?          (integer; managed via drag-reorder in admin UI)
├── publishedAt
└── chapters[]            (ordered array of chapter references)

Chapter
├── id
├── storyId
├── title
├── order                 (integer; same drag-reorder pattern)
└── blobPath              (pointer to Markdown file in Azure Blob)
```

## Future Considerations

- **Multi-author:** series slugs scoped to an author; ownership claimed on first use
- **Cross-universe stories:** `seriesSlug` → `seriesSlugs[]` (array); per-series order becomes slightly more complex but the schema change is small
- **Social layer:** comments, likes, follows — not in scope now

## Open Questions

- Social layer (comments, likes, follows)?
- Image constraints for on-brand consistency — enforced at upload or guidelines only?

## Sub-topics

- [Architecture](architecture.md)
- [Backlog](backlog.md)
- [Aesthetic](aesthethic.md)
