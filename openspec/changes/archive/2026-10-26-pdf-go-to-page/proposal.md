## Why

In an 81-page score, reaching a section means paging or scrolling through many pages. The page indicator (`Page 12 of 81`) shows where you are but cannot take you elsewhere. Split out of `pdf-horizontal-paging` follow-up 6.2 because thumbnails have a rendering and memory cost that deserves its own design.

## What Changes

Decided with the owner (2026-10-26):

- Tapping the page indicator, in every layout, opens a `Go to page` sheet with a page-number field (and a `Go` button) above a grid of page thumbnails; choosing either moves the viewer to that page and closes the sheet.
- The field is 1-based and prefilled with the current page; `Go` is disabled until the value is a whole number from 1 to the page count (no silent clamping), and a hint shows the range.
- Thumbnails are drawn lazily, one at a time, for the rows in view plus a margin, and every canvas is released when the sheet closes. The PDF rendering gains a way to draw a page into a small canvas.
- In `Spread` (see `pdf-paging-follow-ups`), both pages of the current spread are marked, and any chosen page lands on the spread that holds it.
- Web only: native has no PDF renderer yet (`native-playback-follow-ups` 1.6).

Deferred, recorded here so it is not lost:

- Showing part labels or bookmarks from the PDF outline (`getOutline`). Many scans and exports have none, and each entry needs two async lookups to become a page. Build it when a real file with an outline needs it; the sheet leaves room for a section above the grid.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `track-sheet-music`: the page indicator becomes interactive and gains a `Go to page` sheet.

## Impact

- `packages/mobile-rehearsal-player` PDF viewer: page indicator, a new sheet and its pure model, thumbnail drawing in the web renderer.
- Depends on the page-tracking and `goToPage` helpers already in the layout model and `PdfRendering`.
- Shares the indicator with `pdf-paging-follow-ups` 6.7 (previous/next buttons move beside it) and the focus-return rule of 6.8; whichever lands second adapts.
