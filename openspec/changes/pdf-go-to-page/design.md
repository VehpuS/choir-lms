## Context

The web PDF viewer (`renderers/pdf-renderer.web.ts`) opens the document through `openPdf`, which already holds a measured `PdfPage` for every page. `PdfRendering.goToPage(index)` scrolls to a page in any layout. The page indicator (`pdf-layout/page-indicator.tsx`) is a non-interactive pill. Sheets in the viewer are React Native `Modal`s, whose content is not in the test renderer's tree, while a canvas is DOM.

## Goals / Non-Goals

**Goals:**

- Jump to any page by number or by picking its thumbnail, in every layout, without holding every thumbnail in memory or starving the main page drawing.

**Non-Goals:**

- Outline/bookmark labels (deferred, see proposal), native PDF rendering, searching text.

## Decisions

### 1. The indicator becomes a button

The pill takes touches (`accessibilityRole="button"`, label `Go to page`) and opens the sheet. Its layer stays non-blocking outside the pill, so pinch and double-tap on the page area are unaffected. The button hides while no page state exists (as the indicator does today).

### 2. A pure sheet model

`go-to-page/go-to-page-model.ts` holds the decisions, specified without a renderer:

- `parsePageNumber(text, pageCount)` returns the 0-based page for a whole number in `1..pageCount`, else `undefined` (no clamping, no signs, decimals, or blanks).
- `pageRangeHint(pageCount)` returns `1-81`.
- `markedPages(layout, current, pageCount)` returns the pages to highlight: the current page, or both pages of the current spread in `Spread`.
- `visibleRows(scrollTop, rowHeight, viewportHeight, columns, pageCount, margin)` returns the page indexes to draw: visible rows plus one row of margin.

Enter in the field submits like `Go`. The field uses numeric input mode, is prefilled and selected with the current page, and sits in a header above the grid so the soft keyboard never covers it.

### 3. Thumbnails: lazy, serial, released

`PdfRendering` gains `drawThumbnail(index, canvas, cssWidth)` (and a way to cancel one). It renders the existing `PdfPage` at scale `cssWidth * pixelRatio / pageWidth`.

```
open sheet -> grid rows (virtualised)
              | row enters view (+1 row margin)
              v
        serial queue, one render at a time (current page's row first)
              | page.render at thumbnail scale
              v
          canvas kept while the sheet is open
              | row far out of view -> cancel if drawing, canvas.width = 0
close sheet -> cancel queue, release every canvas
```

- **Memory.** A 120 px thumbnail at 2x is about 300 KB; only visible rows plus a margin are held (about 15 to 20), not 81.
- **CPU.** pdf.js runs on the main thread here, so thumbnails must not pile up: one render at a time, renders for rows that left the view are cancelled, and the main viewer's own drawing is not queued behind them (thumbnail renders are cancelled on a page change request).
- **Alternative: render all thumbnails up front.** Rejected: about 24 MB on an 81-page score and a long main-thread stall on opening.
- **Alternative: keep thumbnails across opens.** Rejected for now; releasing on close keeps the rule simple. Revisit if reopening feels slow.

### 4. Web-only grid host

The grid cell that owns a `<canvas>` is `thumbnail-cell.web.tsx`; the shared `.tsx` renders a placeholder, as native has no PDF. The sheet frame, field, and model are shared.

### 5. Choosing a page

The sheet calls the existing page request (`goTo` in `use-pdf-page-control`), then closes. The viewer returns focus to the page area after the sheet closes (the rule from `pdf-paging-follow-ups` Decision 2, applied once for all sheets). In `Spread`, `goToPage` already maps a page to the spread holding it; nothing here depends on `Spread` having shipped.

## Risks / Trade-offs

- [Thumbnails slow the main thread on heavy scores] -> serial queue, cancel on scroll-out, current row first; check on the 81-page score in the browser.
- [Soft keyboard hides the grid on phones] -> field and `Go` in a fixed header; size the sheet to the visible area; check at phone width.
- [Tappable pill conflicts with page gestures] -> only the pill takes touches; check pinch and double-tap near the bottom edge.
- [Canvas leaks after fast open/close] -> release is idempotent and runs on unmount; verify memory returns to baseline.

## Open Questions

- Thumbnail width and column count per breakpoint (first guess: 120 px, 3 columns on a phone, more on wide windows); settle by looking at real widths.
