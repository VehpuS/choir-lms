## Why

In an 81-page score, reaching a section means paging or scrolling through many pages. The page indicator (`Page 12 of 81`) shows where you are but cannot take you elsewhere. Split out of `pdf-horizontal-paging` follow-up 6.2 because thumbnails have a rendering and memory cost that deserves its own design.

## What Changes

Decided with the owner (2026-10-26):

- Tapping the page indicator, in every layout, opens a sheet with a page-number field (and a go button) above a grid of page thumbnails; choosing either moves the viewer to that page.

Still to design (explore before building):

- How thumbnails are drawn without holding 81 rendered pages in memory (small canvases, drawn lazily as the grid scrolls, released when it closes).
- Whether the sheet can show part labels or bookmarks when the PDF has an outline.
- How the sheet behaves in `Spread` (see `pdf-paging-follow-ups`).

## Capabilities

### New Capabilities

None expected.

### Modified Capabilities

- `track-sheet-music`: the page indicator becomes interactive and gains a `Go to page` sheet.

## Impact

- `packages/mobile-rehearsal-player` PDF viewer: page indicator, a new sheet and its pure model, thumbnail drawing in the web renderer.
- Depends on the page-tracking and scroll-to-page helpers already in the layout model.
