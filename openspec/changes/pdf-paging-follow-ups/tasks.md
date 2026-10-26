## 1. Tune and verify what shipped

- [x] 1.1 **Explore with the owner in the browser preview:** wheel and trackpad paging in `Pages` (the threshold of about two notches and the pause); change the constants only if the feel is wrong (original 6.9). Spec any changed constant. (Owner: feels right; constants unchanged.)
- [ ] 1.2 Check swipe snapping in `Pages` with a real touch fling on a phone and a tablet (the browser pane cannot produce one): a fast fling must not skip a page and a slow drag must settle on the nearer page (original 6.11). Manual; record the result in `design.md`.

## 2. Zoom, focus, and scrollbar

- [x] 2.1 Reset zoom to 1 on a layout change while keeping the page and in-page fraction (design Decision 1). Spec: zoomed in `Scroll`, then `Pages` lands fitted and snapping; the page is kept.
- [x] 2.2 Return focus to the page area after a sheet closes or a toolbar action, never taking it from a text field (design Decision 2). A pure focus rule with a spec; a thin `.web` call in the viewer. (Built in `pdf-go-to-page` 5.2: `shouldTakeFocus`, the viewer's `focusRequest`, and the surface's focus call, for the Go to page and Layout sheets and the zoom, fit, and page-step buttons.)
- [x] 2.3 Hide the horizontal scrollbar in `Pages` and keep it in `Strip` (design Decision 4). Verify in the browser at phone and desktop widths. (Done at phone width and, with `Spread`, at 1024 px; the host gets a `data-pdf-scrollbar` mark in `Pages`, removed in the other layouts. `Strip` kept its scrollbar at phone width.)

## 3. Toolbar and page turns

- [x] 3.1 **Explore with the owner before building:** how the compact landscape side rail holds the page indicator and page buttons (design Open Questions); update the design with the choice. (Owner: the rail keeps the controls, with `Previous`/`Next` and an `n/81` label; see design Open Questions.)
- [x] 3.2 Move `Previous page` and `Next page` beside the page indicator and keep the toolbar to zoom, `Layout`, piano, and play (original 6.7); in the compact landscape rail they sit in the rail around a short `n/81` label (design Open Questions). A pure model for the indicator row with a spec; verify the phone-width `Pages` toolbar fits one row. (Built: `Previous`/`Next` flank the indicator pill over the page with the pill's scrim; the compact rail shows `‹`, `n/81`, `›` and now scrolls. Verified at 400 px portrait and 812x375 landscape.)
- [x] 3.3 Animate control and key page turns with a short smooth scroll, instant under reduced motion, suspending snap during the turn (design Decision 5). Specs for the reduced-motion decision and for repeated turns ending at the newest target; verify in the browser.

## 4. Spread layout

- [x] 4.1 Settle the width threshold for `Spread` by trying real widths with the owner, and record it in `design.md` (design Open Questions). (Owner: 360 px per page, available from 760 px; tuned in 4.6.)
- [x] 4.2 Add `spread` to `PdfLayout` in `@org/audio-library-models` with parsing specs (old data, unknown value, `spread` kept), and `isSpreadAvailable` with specs. (`isSpreadAvailable` and `resolveEffectivePdfLayout` live in the app's `renderers/pdf-spread-availability.ts`, since availability is a viewer-width rule. The sheet offers `Spread` only when available; the viewer passes `false` until 4.4 can draw it.)
- [x] 4.3 Add the `Spread` layout to `pdf-layout-model.ts`: spread boxes, the spread of a page and the pages of a spread, scroll-to-spread offsets, and an odd last page. Specs for each. (In `pdf-spread-layout.ts`: both pages of a spread share one slot span, so `scrollOffsetForPage` lands on the spread from either page and `pageAtOffset` reads the first page; `stepTargetPage` steps by spread.)
- [x] 4.4 Render `Spread` in `pdf-renderer.web.ts`: slot per spread, snapping only while fitted, lazy drawing of the current spread and one neighbor each side, paging by spread, the hidden scrollbar, and a layout-change anchor on the first page of the spread.
- [x] 4.5 Offer `Spread` in the layout sheet only when available, fall back to `Pages` when the viewer narrows (without rewriting the stored layout), and show `Pages 3-4 of 81` in the indicator. Model and component specs.
- [x] 4.6 Verify in the browser at desktop and tablet widths: spread paging, resize to narrow and back, zoom and unzoom, a stored `spread` on a narrow viewer, an odd page count, and memory staying flat on the 81-page score.

## 5. Validation

- [x] 5.1 Update the README's viewer notes if they describe the PDF layouts, and run `openspec validate pdf-paging-follow-ups`.
- [ ] 5.2 Run lint, test, typecheck, and build for the touched projects through Nx, plus `nx format:check --base=origin/main` and `nx sync:check`.
- [ ] 5.3 Sync the delta specs into `track-sheet-music` and archive this change after the owner's go-ahead.

## 6. Future tasks (not in scope here)

- [ ] 6.1 Right-to-left page order for documents that declare it; deferred until a real right-to-left file needs it (original 6.1). Explore with a user before changing.
- [ ] 6.2 Add the layouts and page paging to native when native PDF rendering exists (`native-playback-follow-ups` 1.6; original 6.4).
- [ ] 6.3 `Go to page` and thumbnails live in `pdf-go-to-page`; the 317-line repository file was split directly (original 6.12).
- [ ] 6.4 Look at the page-turn slide (about 200 ms; the browser sets the real length) and the reduced-motion path in a foreground browser with the owner, on a phone-width and a desktop viewer; the Browser pane reports the page as hidden, so only end states were verified (found in 3.3). Slide ends are read from the scroll (`SMOOTH_TURN_IDLE_MS`, `SMOOTH_TURN_STALL_MS`); adjust only if it feels wrong.
