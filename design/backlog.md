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

## Image Upload (Admin)

**As an admin, I want to upload cover and chapter images that are constrained to brand guidelines before being stored.**

### Scope
- [ ] Image upload UI in admin (story edit page)
- [ ] Client-side aspect ratio and max dimension enforcement before write
- [ ] Write to Azure Blob Storage (`images/{storySlug}/{imageId}.{ext}`)
- [ ] Display uploaded images on StoryTitle and Chapter pages
