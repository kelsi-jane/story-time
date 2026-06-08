# Writing Guide for Authors

This guide covers everything you can use in the **Content** tab when writing your chapters — standard formatting and the custom artifact blocks unique to this platform.

---

## Standard Markdown

### Headings

```
# Chapter Title
## Scene Heading
### Sub-section
```

Use headings sparingly inside prose. A `##` scene heading works well for POV or time shifts.

---

### Images & Links

| Syntax | Result |
|--------|--------|
| `[link text](https://example.com)` | Clickable hyperlink |
| `![alt text](https://example.com/photo.jpg)` | Inline image |

Images render full-width inside the reading column. For a more intentional, styled presentation — a photograph a character discovers, a postcard sent between them — use the `:::photo` artifact instead (see below).

---

### Emphasis

| Syntax | Result |
|--------|--------|
| `*italic*` or `_italic_` | *italic* |
| `**bold**` or `__bold__` | **bold** |
| `***bold italic***` | ***bold italic*** |

---

### Paragraphs & Line Breaks

Leave a blank line between paragraphs. A single line break within a paragraph is treated as a space — it does **not** start a new paragraph.

---

### Block Quotes

Use `>` for epigraphs, chapter openers, or quoted speech that stands apart from the prose:

```
> The past is never dead. It's not even past.
>
> — William Faulkner
```

> The past is never dead. It's not even past.
>
> — William Faulkner

---

### Horizontal Rules

A line of three dashes `---` produces a section break:

---

### Lists

```
- Item one
- Item two
  - Nested item

1. First
2. Second
3. Third
```

---

### Inline Code & Code Blocks

Wrap in backticks for inline `code`. Use triple backticks for a fenced block:

```
```
A block of text set apart —
perhaps a cipher, a recipe,
or a fragment of something older.
```
```

---

## Custom Artifacts

Artifacts let you embed physical-world objects directly into your prose — the kind of things your characters might hold, find, or leave behind. They render as styled visual blocks in the Preview tab.

**Syntax:**

```
:::artifact-name
Content goes here.
:::
```

---

### sticky-note

A handwritten-feel note on amber paper, slightly tilted.

```
:::sticky-note
Don't forget — the key is under the third brick from the left.
K.
:::
```

**Best for:** quick notes, reminders left between characters, marginalia.

---

### handwritten

Cursive-style text on ruled lines. Suggests a journal entry, personal letter draft, or inscription.

```
:::handwritten
I never meant for any of this to happen.
If you're reading this, then I suppose it already has.
:::
```

**Best for:** diary excerpts, confessions, dedications, inscriptions inside books.

---

### letter

A formal letter on cream paper with a ruled header. Suggests official correspondence.

```
:::letter
Dear Mr. Hale,

It is with regret that I must inform you the position has been filled.
Your application, however, will be kept on file for one year.

Sincerely,
The Committee
:::
```

**Best for:** official notices, correspondence between characters, job offers, rejection letters.

---

### telegram

Monospace text in uppercase, evoking urgency and constraint.

```
:::telegram
ARRIVED SAFELY STOP PACKAGE RECOVERED STOP DO NOT CONTACT UNTIL THURSDAY STOP
:::
```

**Best for:** urgent messages, wartime dispatches, anything where every word cost money.

---

### clipping

A newspaper clipping in a two-column layout on aged paper.

```
:::clipping
LOCAL MAN FOUND MISSING

Authorities confirmed Tuesday that residents have not seen Mr. Edmund Voss
since last Saturday evening. His vehicle was discovered near Miller's Pond
with the engine still running.

Anyone with information is urged to contact the Sheriff's office.
:::
```

**Best for:** news reports, obituaries, classified ads, public records embedded in the story.

Two optional attributes are available for clippings:

- `torn` — adds scalloped torn edges to the top and bottom
- `date` — adds a dateline in the upper right corner

```
:::clipping{torn date="March 14, 1923"}
LOCAL MAN FOUND MISSING

Authorities confirmed Tuesday that residents have not seen Mr. Edmund Voss
since last Saturday evening.
:::
```

---

### photo

A polaroid-style photograph with a thick white border and optional handwritten caption below.

```
:::photo
![A lighthouse at dusk](https://example.com/lighthouse.jpg)
Taken the night before everything changed.
:::
```

**Best for:** found photographs, character portraits, location imagery, visual scene-setting.

Optional attributes:

- `noborder` — removes the white border and shadow, leaving just the image
- `tilt` — slight rotation angle (e.g. `tilt="2deg"`)
- `wrap` — float the photo and flow prose text around it: `wrap="left"` or `wrap="right"`

```
:::photo{wrap="right" tilt="1.5deg"}
![Old map fragment](https://example.com/map.jpg)
Found in the captain's quarters.
:::

The rest of the paragraph flows naturally to the left of the photograph,
as if it had been pinned to the margin of the manuscript.
```

---

### sms

An iPhone-style message thread. Use `::them[message]` for the other person (left, gray) and `::me[message]` for the protagonist's replies (right, blue).

```
:::sms
::them[Hey, are you coming tonight?]
::me[Yeah. Give me an hour.]
::them[Don't be late this time.]
::me[I won't.]
::them[That's what you said last time.]
:::
```

**Best for:** text exchanges between characters, evidence on a character's phone, modern correspondence.

Standard inline formatting works inside messages — `**bold**`, `*italic*`, etc.

Optional attributes:

- `wrap` — float the phone and flow prose around it: `wrap="left"` or `wrap="right"`
- `fade` — clip the conversation at one edge with a gradient fade, suggesting a longer thread: `fade="top"` (bottom is visible, top fades) or `fade="bottom"` (top is visible, bottom fades)

```
:::sms{wrap="right" fade="bottom"}
::them[Don't be late this time.]
::me[I won't.]
::them[That's what you said last time.]
:::

She set the phone face-down on the counter and didn't reply.
```

---

## Fonts

Use the `font` attribute on any artifact to override its default typeface. The following fonts are available:

| Name | Value to use | Character |
|------|-------------|-----------|
| Caveat | `Caveat` | Handwritten, natural — default for sticky-note and handwritten |
| Lora | `Lora` | Elegant serif — good for letters and formal documents |
| Georgia | `Georgia` | Classic newspaper serif — default for clipping |
| Courier New | `Courier New` | Monospace — default for telegram |
| Inter | `Inter` | Clean sans-serif — good for modern notes |

**Example:**

```
:::letter{font="Courier New"}
To Whom It May Concern,

This letter has been typed, not written by hand.
:::
```

---

## Tips

- **Artifacts inside prose** — place a blank line before and after the `:::` block so it sits cleanly between paragraphs.
- **Nesting** — standard markdown (bold, italic, line breaks) works inside artifact blocks.
- **Preview** — switch to the **Preview** tab at any time to see how your chapter will look to readers.
- **Saving** — content saves automatically as you type. There is no save button.
