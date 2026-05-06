# Backlog

---

## Hamburger Nav Menu

**As a reader, I want the hamburger menu to give me full site navigation in one place, with my personalized content at the top for quick access.**

### Decisions
- Opens as an overlay/drawer (not a full page navigation)
- **Two sections:**
  1. **Quick links (top)** — the reader's current panel cards in their preferred order, same data already loaded. This is the same content as the reader panel, surfaced here for readers who prefer the drawer over scrolling.
  2. **All navigation (below)** — every other destination on the platform that isn't in the reader panel: Browse All Stories, Settings, About, etc. This is the full site map.
- The reader panel is a curated "pinned" subset; the hamburger is the complete nav
- Quick links section respects reader panel customization preferences (see Reader Panel Customization)

### Scope
- [ ] Hamburger button triggers an overlay drawer
- [ ] Top section: reader panel quick links (reuses loaded data, no extra fetch)
- [ ] Bottom section: full platform navigation links
- [ ] Subtle divider and section labels between the two areas
- [ ] Drawer closes on outside click or Escape key

---

## Reader Panel Customization

**As a reader, I want to choose which cards appear in my reader panel and in what order, so the panel surfaces what matters most to me.**

### Decisions
- Preference is per-reader, persisted in localStorage (anonymous) or user settings (authenticated)
- Default order is defined by the platform; reader can reorder or hide individual cards
- Cards that have no data are hidden automatically regardless of preference (no empty sections)

### Scope
- [ ] Preference key in localStorage (e.g. `st-panel-prefs`) storing ordered list of enabled section IDs
- [ ] Settings UI — accessible from reader settings page (see Reader Settings Page) or an inline panel edit mode
- [ ] `ReaderPanel` reads preference order and filters accordingly before rendering
- [ ] Default: all sections enabled in platform-defined order

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

## Reader Accounts (Authentication)

**As a reader, I want to create an account so that my reading history, bookmarks, and preferences follow me across devices and browsers.**

### Timing

Targeted for Phase 3. Data loss risk from delaying is proportional to reader volume — at expected early scale, the exposure is small. Revisit if readership grows meaningfully before Phase 3 begins.

**GitHub OAuth as a bridge option:** GitHub OAuth is already wired into the SWA instance for admin auth. It could serve as a low-cost early option for reader identity without building a full account system. Downside: GitHub accounts are a poor fit for a general reader audience. Worth considering only if the reader base skews technical in early phases.

### Migration from anonymous identity

When reader accounts are introduced, each reader's anonymous `st-reader-id` (generated on first visit and stored in localStorage) is the migration key. On first authenticated session per device, the client sends the anonymous ID to the server, which reassigns all `ReadingEvent` records carrying that ID to the authenticated user.

**Multi-device is handled naturally:** each device runs the merge independently. Two devices → two merge calls → both event sets land under the same account.

**Migration cutoff:** Remove the anonymous-to-authenticated merge code 60–90 days after reader auth ships. Events still in localStorage after that window are dropped. Document the cutoff date in `design/deployment.md` at the time of release.

**Truly unrecoverable** (no merge strategy fixes these):
- Reader cleared browser data before creating an account
- Events collected during a private/incognito session
- Visits on a new device made after the account already exists

### Scope (when built)

- [ ] Reader account creation and login flow
- [ ] Session persistence (cookie or token)
- [ ] Anonymous ID merge endpoint — called on first login per device, idempotent
- [ ] `st-reader-id` in localStorage updated to `userId` post-merge so future events write under the real ID
- [ ] All reading history, bookmarks, and preferences scoped to `userId` going forward

### Future / out of scope at launch

- Merging multiple anonymous IDs into one account (reader used two browsers before signing up) — accepted gap for Phase 1 of auth
- Social login providers beyond GitHub (email/password, Google, etc.)

---

## Merge Anonymous Reading History on First Login

**As a reader who browsed anonymously before creating an account, I want my reading history to carry over automatically, so that "pick up where you left off" and other personalized features work from day one.**

### How it works

On every authenticated session start, the client reads `st-reader-id` from localStorage and sends it to the server alongside the session credential. The server reassigns all `ReadingEvent` records with that `readerId` to the authenticated `userId`, then returns. The client updates `st-reader-id` in localStorage to the `userId` so all future events write under the real ID.

### Acceptance criteria

- [ ] Merge is triggered on first login per device, automatically — no reader action required
- [ ] Merge is idempotent — safe to call on every login; re-running with an already-merged anonymous ID is a no-op
- [ ] Events from multiple devices are all recoverable — each device's anonymous ID is merged independently
- [ ] If the anonymous ID has no corresponding events (localStorage was cleared, or new device), the merge is a no-op with no error
- [ ] `st-reader-id` is updated to `userId` after merge — future events on this device write under the real ID
- [ ] Pre-merge events are queryable under the authenticated account after merge completes

### Out of scope

- Merging multiple anonymous IDs from different browsers on the same device into one account — accepted data loss
- Retroactive merge for anonymous IDs older than the migration cutoff window

---

## Self-Hosted Image Upload (Phase 2)

**As an admin, I want to upload cover images directly rather than providing an external URL, so that images are reliably served and not dependent on third-party hosting.**

### Current state

Cover images are supported today via external URL — `coverImageUrl?: string` on `Story`, entered as a plain URL in the admin story form. Rendering is in place on both the story title page and discovery cards. No backend work is needed to use the current approach.

The `coverImageUrl` field is a plain URL string. Switching from an external URL to a self-hosted blob URL is a field update only — no front-end or type system changes required. Both coexist naturally.

### Why Phase 2

Self-hosted images are the right long-term answer (no link rot, CDN-backed, content control), but require meaningful backend work. External URLs are acceptable at early scale; an author managing their own content will notice and fix broken images quickly.

### Implementation (when built)

| Area | Change |
|---|---|
| Azure Blob Storage | New container `story-images`, public read, private write |
| `src/api/` | New Azure Function `POST /api/images/upload` — accepts `multipart/form-data`, writes to Blob, returns blob URL |
| `StoryEdit.tsx` | Add file picker alongside URL input; on select, upload and populate `coverImageUrl`. Keep URL fallback. |
| `StoryNew.tsx` | Same as StoryEdit |
| `deployment.md` | Add `story-images` container setup to production deployment steps |

Front-end rendering (`StoryTitle.tsx`, `Discovery.tsx`) requires **no changes**.

### Scope
- [ ] Azure Blob Storage container `story-images` with public read access
- [ ] `POST /api/images/upload` Azure Function
- [ ] File picker UI in `StoryEdit.tsx` and `StoryNew.tsx`
- [ ] Client-side validation: max file size, accepted MIME types (`image/jpeg`, `image/png`, `image/webp`)
- [ ] `deployment.md` updated with container provisioning steps
