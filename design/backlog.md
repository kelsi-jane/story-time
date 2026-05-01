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
