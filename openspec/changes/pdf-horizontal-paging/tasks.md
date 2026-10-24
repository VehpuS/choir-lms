## 1. Layout model and preference

- [x] 1.1 Add `renderers/pdf-layout-model.ts`: the layout type (`scroll`, `pages`, `strip`), page boxes and content size for each layout from the container size, page sizes, and zoom, the page index and in-page fraction at a point, and the scroll offset that brings a page (or a page and fraction) into view. Spec each layout's boxes, the fits (width in `Scroll`, whole page in `Pages`, height in `Strip`), the page at a point, and the scroll-to-page offsets.
- [x] 1.2 Add the device-wide layout preference (`pdf-layout-storage.ts` and `pdf-layout-store.ts`, following `my-parts-storage.ts` and `my-parts-store.ts`): restore, validate (unknown becomes `scroll`), persist, and a `usePdfLayout` hook. Spec restore, persist, and invalid values with an in-memory storage.

- [x] 1.3 Add `PdfLayout` and the optional `pdfLayout` field to `SheetMusicSource` in `@org/audio-library-models`, parsed with the source (an unknown value drops the field, not the source), and `resolvePdfLayout(source, devicePreference)` returning the source's own layout, else the device layout, else `scroll`. Specs for parsing old data without the field, an unknown value, and each resolution step.
- [x] 1.4 Save and clear a source's layout in `@org/audio-library-runtime` through `updateSheetMusicSource` (`pdfLayout: null` clears), and expose it from `useSourceSheetMusic`. Specs through the repository: save, change, clear, an unknown source id, and that nothing else on the source or track changes.

## 2. Renderer

- [x] 2.1 Make `pdf-renderer.web.ts` apply page boxes from the layout model (still `Scroll` only), keeping today's behavior and its specs; extract helpers so the file stays near 300 lines. Verify in the browser that `Scroll` is unchanged.
- [x] 2.2 Add the `Strip` layout: pages in a row, horizontal lazy-drawing margin, rebuilt observer on a layout change, and `setLayout` keeping the page and in-page fraction in view.
- [x] 2.3 Add the `Pages` layout: one slot per page, snapping only at fitted zoom (turned off above fit and on again at fit, scrolling to the nearest page), and `goToPage(index)` that works at any zoom.
- [x] 2.4 Add page tracking: `currentPage()` and a throttled page-change callback from scroll position, plus a width-change relayout that keeps the page.

## 3. Viewer

- [x] 3.1 Add the `Layout` toolbar button and its options sheet (`Scroll`, `Pages`, `Strip`, current one marked), the `Only for this file` switch, the `This file uses its own layout` note, and `Use the device layout`, wired to the device preference and the source's layout (design Decision 5). Confirm the icon glyphs with the owner first (design Open Questions). A pure model for what the sheet shows and where a choice is saved, with specs for each case (no override, with an override, switch on and off), and a component spec for the sheet's choices.
- [x] 3.2 Add the page indicator and, in `Pages`, `Previous page` and `Next page` controls disabled at the ends; a pure model for the indicator text and the disabled states with a spec.
- [x] 3.3 Add keyboard paging (arrows and `Page Up`/`Page Down`) and the vertical-wheel-to-sideways mapping for `Strip` and `Pages` at fitted zoom, as thin `.web` listeners over pure functions with specs.

## 4. Zoom in every layout

- [ ] 4.1 Define zoom per layout (100% fits the width in `Scroll`, fits the viewer in `Pages` and `Strip`) and check the `Fit` double-tap toggle, the zoom controls, and the 50% to 400% range in each; spec the fit math.
- [ ] 4.2 Check pinch, wheel zoom, and focal-point scrolling in `Strip` and `Pages` and fix any axis that does not hold the point under the fingers.

## 5. Verification and wrap-up

- [ ] 5.1 Verify in the browser preview with the 81-page `Radio Video V5.0 Score and Parts` PDF at phone width and a desktop width: each layout, a file with its own layout beside one without (including after reopening the app), clearing a file's layout, switching layouts mid-document, the page indicator, keyboard, swipe snapping (touch emulation), zoom and unzoom in `Pages`, rotating (width change), and memory staying flat. Note results per scenario in the spec.
- [ ] 5.2 Update the README's viewer notes if they describe the PDF viewer, and run `openspec validate pdf-horizontal-paging`.
- [ ] 5.3 Run lint, test, typecheck, and build for `mobile-rehearsal-player` through Nx.
- [ ] 5.4 Archive `save-blocked-sheet-music-links-to-drive` first, then this change, after the user's go-ahead.

## 6. Future tasks (not in scope here)

- [ ] 6.1 **Explore with a user before changing:** right-to-left page order for documents that declare it (design Open Questions).
- [ ] 6.2 **Explore with a user before changing:** a `Go to page` entry from the page indicator, and page thumbnails.
- [ ] 6.3 **Explore with a user before changing:** two-page spreads on a wide tablet or desktop window.
- [ ] 6.4 Add the layouts and page paging to native when native PDF rendering exists (`native-playback-follow-ups` 1.6).
- [ ] 6.5 **Explore with a user before changing:** the horizontal scrollbar under `Pages` and `Strip` (seen in 2.3 on the phone-width preview): keep it, hide it in `Pages` where swiping and page controls move the view, or replace it with the page indicator.
- [ ] 6.6 **Explore with a user before changing:** page turns from `Previous page`, `Next page`, and the arrow keys currently jump instantly; try a short smooth scroll (and whether it should follow the device's reduced-motion setting).
- [ ] 6.7 **Explore with a user before changing:** in `Pages` on a phone the toolbar (zoom, `Layout`, `Previous page`, `Next page`, piano, play) no longer fits one row and the piano button wraps to a second row, which shortens the page area. Try a more compact arrangement (for example, page controls beside the page indicator, or fewer controls in the main row) and how the compact landscape side rail should hold them.
- [ ] 6.8 **Explore with a user before changing:** keys work only while the page area has keyboard focus (design Decision 6 puts the handler on the host). After using a toolbar button or the `Layout` sheet, focus is elsewhere and the arrow keys do nothing until the page is clicked. Options: return focus to the page when a sheet closes or a toolbar button is used, or listen at the viewer level while no text field is focused.
- [ ] 6.9 **Explore with a user before changing:** in `Pages` the wheel turns one page per flick (design Decision 7 says the vertical delta is applied sideways, which a snapping layout would undo); check the feel of the threshold and pause with a mouse wheel and a trackpad.
