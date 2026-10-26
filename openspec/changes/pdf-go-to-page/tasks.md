## 1. Pure model

- [x] 1.1 Add `go-to-page-model.ts` with `parsePageNumber`, `pageRangeHint`, `markedPages` (including the spread case), and `visibleRows`, with specs for each (blank, zero, past the end, decimal, last page, odd last spread, margin at the ends).

## 2. Thumbnails in the renderer

- [x] 2.1 Add `drawThumbnail` (and cancel) to `PdfRendering` and `pdf-renderer.web.ts`, rendering the existing `PdfPage` at a thumbnail scale; native returns unsupported. Spec the scale computation; check one render in the browser. (Specced with a fake page; the browser render check moves to 3.3, since the sheet cannot be opened in the app until the indicator opens it.)
- [x] 2.2 Add the serial thumbnail queue: one render at a time, current row first, cancel for rows out of range, release everything on close. Spec ordering, cancellation, and idempotent release with a fake drawer.

## 3. Sheet and indicator

- [x] 3.1 **Settle with the owner in the browser:** thumbnail width and columns per breakpoint (design Open Questions); record in `design.md`.
- [x] 3.2 Build the `Go to page` sheet frame: header with field, hint, and `Go`; virtualised grid; web `thumbnail-cell.web.tsx` with a placeholder sibling for native. Component specs for the header (disabled states, Enter submits, prefilled value).
- [x] 3.3 Make the page indicator a button that opens the sheet, with the accessible name `Go to page`, and wire the choice to the existing page request, then close the sheet and return focus to the page area (reuse the `pdf-paging-follow-ups` 2.2 rule if landed). Spec the indicator as a button. Then check in the browser: the first real thumbnail render, the 90 px grid legibility on the 81-page score, and that the header field is selected on focus.

## 4. Verify

- [x] 4.1 Browser check on the 81-page score at phone and desktop widths: opens fast, only near rows hold canvases, quick scroll does not stall the page behind, memory returns to baseline after close, soft-keyboard layout at phone width, and pinch/double-tap near the indicator still work. (Done on the 81-page score at 375, 1100 px; the soft keyboard could not be emulated, see 5.4. Memory was judged by canvas count, which returns to 0, not by heap size.)
- [ ] 4.2 In `Pages`, `Strip`, and `Scroll`, go by number and by thumbnail, including the first, last, and current page; when `Spread` exists, check the marked pair and landing.
- [ ] 4.3 Update the README if the viewer's documented controls change, then validate: `nx run mobile-rehearsal-player:test`, `lint`, `typecheck`, and `format:check`.

## 5. Follow-ups (found while implementing; not in scope here)

- [ ] 5.1 `renderers/pdf-renderer.web.ts` is over the 300-line guide (324 lines before this change, now more); extract the layout/zoom anchor handling into a helper with `code-move-checkpointed`.
- [ ] 5.2 Return focus to the page area after the `Go to page` sheet closes. Not done in 3.3 because the `pdf-paging-follow-ups` 2.2 focus rule has not landed; when it does, apply it to this sheet (and the Layout sheet) in one place.
- [ ] 5.3 Open question for the owner: the page indicator pill is small (about 26 px tall) for a touch target. Explore with a user whether to enlarge it (Apple HIG asks for 44 pt) before changing its look, since `pdf-paging-follow-ups` 6.7 also places Previous/Next beside it.
- [ ] 5.4 Manual check on a real phone: with the soft keyboard open, the `Go to page` field and `Go` stay visible above the grid, and the sheet resizes to the visible area. It could not be emulated in the desktop browser pane, and the iOS Simulator has no signed-in library with a PDF.
