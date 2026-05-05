# UI Aesthetic

This document is guardrails for taste, not a design system spec. It exists because the difference between a demo that converts trade-business prospects and one that doesn't lives in details that don't fit cleanly in code reviews. Read this before building any UI; re-read it when you're tempted to "improve" something.

## What we're going for

"Humble eye candy" — clean, considered, slightly distinctive without being flashy. The aesthetic tradition is Linear, Stripe Dashboard, GitHub's modern interface, Vercel's marketing site, Things 3, Notion. These products share a quality that's hard to name but easy to recognize: every element looks obvious in retrospect, like there couldn't have been a different choice. They feel *finished*.

The opposite of the target:

- **Flashy.** Parallax scrolling, gradient backgrounds, animated heroes, decorative micro-interactions on every button. Not us.
- **Stock Bootstrap.** Looks like every other admin panel from 2018. Also not us.
- **Showcase-y.** Custom patterns that announce "designer was here." Not us.

The aesthetic is the *cumulative* effect of restraint applied across the whole surface. It's not in any single feature. If a single element is the part that "looks designed," something is wrong.

## Feel of site
This site should mimick a book, as if someone was sitting down and really has a book in their hand. No harsh colors, good contrast, strict color pallette, etc...

## What earns animation

One moment in the demo get deliberate motion treatment. Nothing else does.

1. **Page-Turning Animation** This is literally just an idea -- I have no idea on implementation details, or if this is even going to be feasible. But it's worth noting that the only animation on this would be page turning.

## Visual primitives

A small, deliberate vocabulary that every component composes from.

### Color palette

Six to eight colors, total. Encode them as CSS variables in `src/Web/src/styles/tokens.css`. Suggested starting palette (steal and refine; don't try to design from scratch):

```css
:root {
  --color-background:          #fdf5f7;  /* Snow — page background */
  --color-surface:             #ffffff;  /* card/panel background */
  --color-surface-muted:       #fce9ed;  /* Lavender Blush — subtle differentiation */
  --color-border:              #f0cdd5;  /* Petal Frost — one-pixel borders */
  --color-text-primary:        #1a1a1a;
  --color-text-secondary:      #b05c7a;  /* Muted Rose */
  --color-accent:              #db2777;  /* Hot Berry — primary actions, links */
  --color-success:             #16a34a;  /* positive states */
  --color-warning:             #d97706;  /* attention states */
  --color-danger:              #dc2626;  /* errors */
}

Resist adding more. If a component "needs" a new color, it usually means an existing one would work and you haven't found it yet.

Dark mode is a planned future feature. It will use an entirely separate palette — deep mauve/plum surfaces with the same accent family. The CSS variable architecture supports this; when the time comes, dark mode is a second set of values under `prefers-color-scheme: dark`, not an inversion of these.

Components reference variables, not hex codes. `background: var(--color-surface)`, never `background: #ffffff`. This makes future adjustments (dark mode, brand customization) tractable.

### Typography

One typeface: **Inter**, loaded via Google Fonts or self-hosted. Two weights: regular (400) and medium (500). No bold for normal text — medium is enough emphasis.

Three sizes for almost everything:
- `text-sm` (~13px) — captions, secondary information, timestamps
- `text-base` (~15px) — body text, default
- `text-lg` (~22px) — section headings, customer status text

One size for the rare big number: `text-xl` (~32px) — the estimate total on the customer status page, the picker page hero. Use sparingly; if every screen has one, none of them do.

Line height: ~1.5 for body, ~1.2 for headings. Tailwind's defaults work.

### Spacing

Snap everything to a 4px grid. Tailwind's spacing scale (`p-2`, `gap-4`, etc.) does this by default — just don't reach for arbitrary values like `p-[13px]`. If a layout doesn't work with 4px increments, the layout is wrong, not the increment.

Whitespace is the most underused tool. When in doubt, add more.

### Borders, shadows, corners

- **Borders:** 1px solid, `var(--color-border)`. That's the whole vocabulary.
- **Corners:** `rounded` (4px) for inline elements, `rounded-lg` (8px) for cards and panels. No `rounded-full` except for avatars and badges.
- **Shadows:** Used very sparingly. A card might have `shadow-sm`. A toast has `shadow-md`. A modal has `shadow-lg`. Most things have no shadow.

Elevation is communicated by *minimal* shadow plus the surface color, not by aggressive shadow stacks.

## The reader-facing surfaces matter most

Three surfaces in the site are what readers will be interacting with. 

1. Content-Discovery page
2. Story Title Page
3. Chapter Content Page 

Spend disproportionate polish budget on these. They should feel *finished* — not just functional. Specifically:

## Loading, empty, and error states

Most demos skip these. A repo that handles them well reads as professional in code review.

- **Loading.** Static spinner, centered, with a brief label ("Loading Content..."). Not a skeleton screen — the data loads fast enough that skeletons over-engineer. Spinner shows for 200ms+ requests; nothing under that.

- **Empty.** Specific to the context. The communication log when no content is received -- a brief explanatory line ("This story appears to still be under construction -- come back soon") rather than blank space.

- **Error.** Specific message when possible ("This content couldn't be loaded."), generic fallback otherwise ("Something went wrong. Try reloading the page."). Always offer a recovery path — a reload link, a retry button, or a way back to the last known good state.

These states are *not optional polish*. They're part of the experience. A reader who hits an error state with a generic crash screen has had a worse experience than one who hits an error state with a clean, readable explanation and a way out.

## Mobile is not a second thought

The reader's primary devices are anticipated to be mobile (take the story with you wherever you go), but the reading surfaces should look right on desktop, too. Build mobile-first for these screens, then make sure they hold up at desktop.

For the admin-facing management surfaces, desktop-first is fine — but verify they don't break on mobile. Stack rather than overlap.

## CSS implementation

New components and pages must use existing CSS classes from `src/web/src/index.css` rather than defining a `const styles: Record<string, React.CSSProperties>` object. Classes available include `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.field`, `.input`, `.page-card`, `.admin-table`, `.admin-page-heading`, `.admin-subheading`, `.admin-divider`, `.badge`, `.badge-accent`, `.badge-success`, `.prose`, and the markdown editor classes.

Use inline styles only for truly one-off values (a specific `maxWidth`, `gap`, or `marginBottom`). If the same inline style appears in two or more components, extract it to a CSS class in `index.css` instead.

## When in doubt, do less

If you're choosing between two visual options, choose the simpler one. If you're choosing between adding a feature and not adding it, lean toward not. If a component has more than five visible elements, ask whether two of them can be removed. If an animation would help, ask whether the same effect happens without animation.

The aesthetic we're going for is the cumulative effect of these many small "less" decisions. It's not achieved by doing one impressive thing. It's achieved by not doing several unimpressive things.