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
- [x] 4.2 In `Pages`, `Strip`, and `Scroll`, go by number and by thumbnail, including the first, last, and current page; when `Spread` exists, check the marked pair and landing. (Done in `Scroll`, `Pages`, and `Strip` at phone width on the 81-page score and a generated 81-page PDF: by number and by thumbnail, for the first, last, current, and a middle page, every case lands on the right page. `Spread` does not exist yet, so its marked pair and landing are covered by the `markedPages` spec only. Two older layout issues found along the way are 5.5 and 5.6.)
- [x] 4.3 Update the README if the viewer's documented controls change, then validate: `nx run mobile-rehearsal-player:test`, `lint`, `typecheck`, and `format:check`.

## 5. Follow-ups (found while implementing; not in scope here)

- [ ] 5.1 `renderers/pdf-renderer.web.ts` is over the 300-line guide (324 lines before this change, now more); extract the layout/zoom anchor handling into a helper with `code-move-checkpointed`.
- [ ] 5.2 Return focus to the page area after the `Go to page` sheet closes. Not done in 3.3 because the `pdf-paging-follow-ups` 2.2 focus rule has not landed; when it does, apply it to this sheet (and the Layout sheet) in one place.
- [ ] 5.3 Open question for the owner: the page indicator pill is small (about 26 px tall) for a touch target. Explore with a user whether to enlarge it (Apple HIG asks for 44 pt) before changing its look, since `pdf-paging-follow-ups` 6.7 also places Previous/Next beside it.
- [ ] 5.4 Manual check on a real phone: with the soft keyboard open, the `Go to page` field and `Go` stay visible above the grid, and the sheet resizes to the visible area. It could not be emulated in the desktop browser pane, and the iOS Simulator has no signed-in library with a PDF.
- [x] 5.5 Bug in `Pages` (not from this change; `Next page` shows it too): on the last page the view cannot scroll to the full slot, so a 15 px sliver of the previous page shows on the left and the last page sits against the right edge. Seen at a 319 px viewer on the 81-page score. Belongs with `pdf-paging-follow-ups`; reproduce and fix there.
- [ ] 5.6 UX: in `Strip` on a wide window (seen at 1500 px, where about 2.5 pages show at once), choosing page N lands page N at the left edge, but the indicator and the sheet's marked page follow the page under the middle of the view, so they read N+1 (and 80 after choosing 81). Explore with a user whether Go to page should center the chosen page, or whether the indicator should follow the leftmost page, before changing it. It affects `Spread` too.
  - Fixed: two causes, both stopping the last slot short of its snap position. A flex item's trailing margin is not scrollable (the last page's centering margin, 66 px on the real score), so the row is now `width:max-content`; and the browser stops a sideways scroll at the outer width of a host with a reserved scrollbar gutter (15 px), so a `pages` row pads its end by that gutter. Checked: page 81 now sits alone in its slot (scroll 21120 of 21399), and a margin test reproduced 21318 before and 21399 after.
