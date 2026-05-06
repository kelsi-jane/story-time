# Backlog

---

## Reader Settings Page

**As a reader, I want a settings page where I can control reading preferences, so the reading surface stays clean and my choices persist across sessions.**

### Decisions
- Accessed via a small settings icon in the top nav of reader pages (chapter view)
- Preferences persisted in `localStorage`
- Does not add any chrome to the chapter reading surface itself

### Scope
- [ ] `/settings` route and page
- [ ] "Swipe to turn pages" toggle (on by default)
- [ ] Settings icon entry point in Chapter page top nav
- [ ] `localStorage` read/write for all preference keys

### Future preferences to consider
- Font size adjustment
- Dark mode toggle (see aesthetic doc — dark palette is a separate design effort)

---

## In-Chapter Pagination ("Page View")

**As a reader, I want chapter content broken into screen-sized pages so the experience feels like turning pages in a physical book.**

### Why this is Phase 2
- Requires measuring actual rendered DOM heights to find safe paragraph-boundary page breaks
- Must recalculate on every viewport resize
- Images (planned) complicate flow unpredictably
- Significant engineering effort on its own

### Gesture conflict to resolve before building
Currently horizontal swipe navigates between chapters. In-chapter pagination would also need horizontal navigation, creating a conflict for the same gesture. Must choose one model before implementation:

| Option | In-chapter page turn | Chapter navigation |
|---|---|---|
| **Tap zones** | Tap left/right edge of page card | Swipe (unchanged) |
| **Swipe with context** | Swipe (advances chapter at last page) | Automatic at boundary |
| **Footer-only chapters** | Swipe handles everything | Footer prev/next links only |

### Note on current scroll + swipe
Current setup (vertical scroll to read, horizontal swipe to change chapter) has no conflict — `touch-action: pan-y` and `preventScrollOnSwipe` keep the gestures isolated. The conflict only arises if pagination is added.

---

## Series Badge on Discovery Cards

**As a reader, I want to see at a glance that a story belongs to a series and what position it holds, so I know where to start.**

### Scope
- [ ] Badge on Discovery card: "Book N of [Series Name]"
- [ ] Derive from `seriesSlug` + `seriesOrder` — data already exists, no model changes needed

---

## Publication Audit Log

**As a platform operator, I want every publish and unpublish action to be permanently recorded, so that publication history is never lost and author attribution is protected.**

### Why this matters

The current `publishedAt: string | null` flag is mutable and creates two problems:

1. **Author-lock bypass.** Author is locked once `publishedAt !== null`, but an admin can unpublish, change the author, and republish — circumventing the lock entirely.
2. **No accountability.** There is no record of who published or unpublished a story, when, or why. This matters for moderation, disputes, and open-source deployments with larger author bases.

### Design decisions

**Publication state is an append-only event log, not a flag.** The current `publishedAt` field on `Story` is replaced by `publicationHistory: PublicationEvent[]`. `publishedAt` and `firstPublishedAt` become values derived from that history at read time.

```
PublicationEvent {
  action:        'publish' | 'unpublish'
  actorUsername: string      // who triggered it — may differ from the story's author
  timestamp:     string
  reason?:       string      // required for unpublish; optional for publish
}
```

**Author lock rule changes.** Author is locked once `firstPublishedAt !== null` — i.e., once the story has ever been published — regardless of current publication state. Unpublish/republish cycles cannot change it.

**Unpublish = temporary, Publish = weighty.** "Unpublish" is an author-initiated "under construction" action: the story is being revised before its next publication. It is not a deletion. Future UI should reflect this asymmetry — publishing is a normal action; unpublishing requires a confirmation gate and a required reason field.

**Archive is a separate, heavier concept.** Archiving a story (permanent removal from reader-facing surfaces) has implications for associated reader data: likes, bookmarks, read history, comments, follows. Archive is out of scope until those reader features exist and the full impact is understood.

### Scope (when built)

- [ ] Replace `publishedAt: string | null` on `Story` with `publicationHistory: PublicationEvent[]`
- [ ] Derive `publishedAt` (most recent `'publish'` event timestamp, or null) and `firstPublishedAt` (first `'publish'` event timestamp, or null) — expose as computed fields or derive at call sites
- [ ] Update author-lock rule in `StoryEdit` to use `firstPublishedAt` instead of `publishedAt`
- [ ] Update all publish/unpublish API calls to append an event rather than overwrite a field
- [ ] Update admin UI publish/unpublish buttons to pass `actorUsername`
- [ ] Unpublish gate: confirmation modal + required reason field (populated as `reason` on the event)
- [ ] Admin story list: surface publication state derived from history (no visible change for readers)

### Future / out of scope now

- Moderator role: a non-author admin unpublishing someone else's story. The `actorUsername` field on `PublicationEvent` already supports this — the permission model is what's deferred.
- Archive action and its implications for associated reader data.
- Notification to author when a moderator (not the author) takes down their story.

---

## Secure Content Delivery (IP Protection — Story 3)

**As an author, I need chapter content to be impossible to bulk-scrape via direct API or storage access, so that my work cannot be programmatically extracted even by technically sophisticated actors.**

### Why this is critical

This must land **before blob storage goes live**. If Azure Blob Storage containers are set to public access, the content URLs are trivially discoverable and downloadable regardless of any client-side protections. `robots.txt` and `user-select: none` are irrelevant once someone has direct blob access.

### Architecture requirement

**Content must never live at a publicly accessible URL.** All chapter content is served exclusively through an Azure Function at `/api/chapters/{id}/content`. The function is the only entity with storage credentials.

### Scope

- [ ] Azure Blob Storage content container: **private** (no anonymous read access)
- [ ] `GET /api/chapters/{id}/content` Azure Function: validates published status, fetches blob server-side, returns content body
- [ ] Client `getChapterContent()` changes from fetching a blob URL to calling `/api/chapters/{id}/content`
- [ ] Remove `blobPath` from any client-visible API response — it is an internal server detail only
- [ ] Function-level hardening: reject missing/mismatched `Referer` header; reject known scraper `User-Agent` strings
- [ ] Rate limiting: cap chapter content fetches per reader ID per hour (leverages reading history infrastructure)

### Future / out of scope at this story

- Reader authentication gating (serve content only to authenticated readers) — Phase 3
- SAS URL generation for time-limited access — not needed if content is always proxied

---

## Reading Surface Watermark (IP Protection — Story 4)

**As an author, I want screenshots of my content to be attributable, so that if my work appears elsewhere I can demonstrate it was accessed from this platform.**

### Approach

A low-opacity overlay on the `.page-card` reading surface displaying the reader's identifier and access date. Rendered via a CSS pseudo-element or `position: fixed` layer with `pointer-events: none` so it does not interfere with the reading experience.

### Content

- Reader identifier: anonymous UUID from `st-reader-id` (already implemented), or authenticated username when reader accounts exist
- Access date
- Site name / copyright line

### Dependency

The `getOrCreateReaderId()` function from `src/web/src/api/reader-identity.ts` is already built. This story is unblocked.

### Limitation

A cropped screenshot or AI inpainting can remove a watermark. Its primary value is legal: it establishes when and by whom content was accessed from this platform, supporting a DMCA or infringement claim.

### Scope

- [ ] Watermark overlay component or CSS layer on `.page-card`
- [ ] Reader ID sourced from `getOrCreateReaderId()` (anonymous) or auth context (authenticated)
- [ ] Opacity and styling that is visible in a screenshot without materially degrading the reading experience
- [ ] Ensure watermark does not appear on admin-facing pages or the story title page

---

## Image Upload (Admin)

**As an admin, I want to upload cover and chapter images that are constrained to brand guidelines before being stored.**

### Scope
- [ ] Image upload UI in admin (story edit page)
- [ ] Client-side aspect ratio and max dimension enforcement before write
- [ ] Write to Azure Blob Storage (`images/{storySlug}/{imageId}.{ext}`)
- [ ] Display uploaded images on StoryTitle and Chapter pages
