## Context

The web PDF renderer (`renderers/pdf-renderer.web.ts`) draws every page into a vertical flex column. Each page wrapper gets its final size up front (`pdf-page-layout.ts`: width = container width x zoom, height from the page's aspect ratio), so the scroll length is right, and an `IntersectionObserver` draws only pages near the viewport (a margin of 150% above and below) and releases the rest. Zoom changes release every canvas and lay the column out again. The viewer owns zoom (`useViewerZoom`) and, since change `save-blocked-sheet-music-links-to-drive`, PDFs zoom to 400% and respond to pinch, `Ctrl`/`Cmd` + wheel, and double tap through `attach-pdf-zoom-gestures.web.ts`, which keeps the point under the fingers fixed by scaling the scroll offsets by the content's measured size ratio.

Measurements from that change (design Decision 8 there) matter here: an 81-page Drive score holds only 2 to 5 canvases at a time, zoom steps redraw in about half a second, and zooming out from 400% blocks the main thread for about a second. MusicXML staves already scroll sideways as one strip, so the viewer and its toolbar already handle a horizontally scrolling surface.

Constraints: web only (native has no PDF renderer), no new dependencies, the 300-line file guideline, pure layout math with specs and thin DOM code, and the zoom range and gestures must keep working unchanged in `Scroll`.

## Goals / Non-Goals

**Goals:**

- Three layouts (`Scroll`, `Pages`, `Strip`) from one control, remembered per device, with an optional override for a single file.
- A page indicator and page-to-page movement, including the keyboard.
- Changing layout, zooming, and resizing keep the reader on the same page.
- Pages stay lazily drawn in every layout.

**Non-Goals:**

- Native rendering or a native layout control.
- Two-page spreads (facing pages).
- Right-to-left page order (see Open Questions).
- A page thumbnail strip or a `Go to page` entry box (possible later; the indicator is not interactive in this change).
- Changing how MusicXML and MIDI are drawn.

## Decisions

### 1. One layout model for all three layouts

A pure `pdf-layout-model.ts` takes the layout, the container size, each page's size, and the zoom, and returns every page's box (left, top, width, height) and the content's total size. `Scroll` is the existing math (width fits at zoom 1). `Strip` fits each page's height to the container at zoom 1 and places pages left to right with the existing 12 px gap. `Pages` places pages left to right in slots as wide as the container, each page fitted whole (the smaller of the width fit and the height fit) and centered in its slot. The renderer applies these boxes; it no longer decides sizes itself.

- **Why one model:** the page index under the viewport, scroll-to-page offsets, the lazy-drawing window, and focal-point zoom all derive from the same boxes, so each is specified once and tested without a browser.
- **Why not CSS-only (flex row plus `scroll-snap`):** it would work for the layout but not for page tracking, scroll-to-page, or keeping the page after a layout change, which need the positions.

Zoom is relative to each layout's fit: 100% is "fits the width" in `Scroll` and "fits the viewer" in `Pages` and `Strip`. The `Fit` double-tap toggle (100% to 200% and back) means the same in each.

### 2. `Pages` snaps only when fitted

At zoom 1, `Pages` uses `scroll-snap-type: x mandatory` with each slot a snap point, so a swipe settles on a page. Once zoomed above fit, a page is wider or taller than the slot and snapping would fight panning, so snapping is turned off and the layout behaves like `Strip` for that moment; returning to zoom 1 turns it back on and scrolls to the page that was nearest. The `Previous page` and `Next page` controls and the arrow keys scroll to a page's own left edge, so they work at any zoom.

- **Alternative: reset zoom on every page turn.** Simpler, but it loses a singer's chosen zoom on each turn, which is the main thing they set up before playing.

### 3. The page is the anchor, not the scroll offset

A layout change, a width change (rotating the phone), and the viewer's zoom steps all record the page index nearest the viewport's reading point and the offset inside that page as a fraction, lay the pages out again, and scroll so the same page and fraction are in view. Focal-point zoom from the earlier change keeps its content-size-ratio method; it is generalized to both axes already, so it needs no change for `Strip` and `Pages`.

### 4. Lazy drawing is horizontal in `Strip` and `Pages`

The observer's `rootMargin` becomes `150% 0px` for `Scroll` and `0px 150%` for `Strip` and `Pages`, and the observer is rebuilt on a layout change. In `Pages` that draws the current page and one neighbor on each side, which is what a swipe reveals. Releasing far pages is unchanged.

### 5. A device default, and a per-file override on the source

The layout a PDF opens in is resolved in order: the source's own `pdfLayout`, else the device preference, else `Scroll`. A pure `resolvePdfLayout(source, devicePreference)` does this and is the only place the order lives.

- **Device default.** A small store (`pdf-layout-store.ts`, `pdf-layout-storage.ts`) follows the `My parts` pattern: a module-level value shared through `useSyncExternalStore`, restored once from async storage under `choirlms.sheet-music.pdf-layout`, validated on read (an unknown value is ignored), and written on change.
- **Per-file override.** `PdfLayout` (`'scroll' | 'pages' | 'strip'`) and an optional `pdfLayout` field live on `SheetMusicSource` in `@org/audio-library-models`, parsed with the rest of the source: an unknown value drops the field rather than the source, as a bad part selection does. `@org/audio-library-runtime` saves it through `updateSheetMusicSource`, whose change object already carries `partSelection` (where `null` resets); `pdfLayout: null` clears the override the same way. Nothing else on the source or track changes.
- **Why on the source, not keyed by file content:** the app never stores or hashes file contents, and the same Drive file added to two tracks is two sources, each of which a singer may read differently. The source is already where per-file reading choices (parts) live, so the layout travels with its label and parts, and an existing library reads as "no override".
- **Why not only a per-file setting:** most singers want one way of reading everywhere; a per-file choice for every new PDF would be repeated work.

In the layout sheet (Decision 6) the three layouts set what the user is looking at, and a switch, `Only for this file`, decides where the choice is saved: off (the default) saves it as the device layout; on saves it on this source. When the file has its own layout, the sheet says so (`This file uses its own layout`) and offers `Use the device layout`, which clears it. Switching `Only for this file` on does not change the device layout, and a choice made with it off does not touch a file that has its own layout, so the screen never changes under a file the singer set by hand: if the open file has its own layout and the user picks a device layout, the sheet keeps showing the file's own layout and says the device layout was changed.

### 6. Controls and indicator

A single `Layout` toolbar button opens the app's existing options sheet with three choices (`Scroll`, `Pages`, `Strip`), the current one marked, instead of three more toolbar buttons: the toolbar already holds zoom, fit, go to, piano, and play, and a phone held sideways moves them into a narrow rail. In `Pages` the toolbar also shows `Previous page` and `Next page`. The page indicator (`Page 3 of 81`) is a small label over the surface in every layout, updated from scroll position with the layout model's page-at-point function, throttled to a frame. It is not interactive in this change.

The keyboard handler lives on the surface's host element and is active only while a PDF is open: left and right arrows and `Page Up` and `Page Down` move a page in `Pages` and `Strip`; in `Scroll` only `Page Up` and `Page Down` and the arrows keep their browser scrolling behavior.

### 7. Wheel and trackpad behave sensibly sideways

In `Strip` and `Pages` at fitted zoom there is nothing to scroll vertically, so a plain vertical mouse wheel scrolls sideways. In `Strip` the vertical delta is applied to the horizontal offset; in `Pages`, where a pixel nudge would only snap back, enough wheel movement (about two notches) turns one page and the wheel is then ignored for a moment (task 3.3; feel to be explored, tasks 6.9). A trackpad's horizontal swipe already scrolls sideways and is left alone. `Ctrl`/`Cmd` + wheel keeps zooming.

### 8. Verification results (task 5.1, 2026-10-25)

Run in the web preview with the real Drive PDF `Radio Video - A Capella - V5.0 - Score and Parts` (81 pages) at a 375 x 812 phone pane (touch emulation on, pixel ratio 2), the same pane turned to 812 x 375, and a 1200 x 800 pane. The `Hebrew` one-page PDF on the same track served as "another file". Layout sheet, keys, and wheel were driven through the real controls and events; pinch used synthetic touch events (a real touch fling is not possible in the pane, see the limits below).

| Spec scenario                                      | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default layout (no stored choice)                  | Opens `Scroll`: a column of 335 px pages in a 335 px viewer. Pass.                                                                                                                                                                                                                                                                                                                                                                                        |
| `Pages` layout                                     | One whole page at a time (335 x 474 on the phone, 419 x 592 at 1200 px), `x mandatory` snapping on. Arrows, `Page Up`, `Next page`, and the wheel each moved exactly one page. Pass.                                                                                                                                                                                                                                                                      |
| `Strip` layout                                     | Pages in one row, each as tall as the viewer (438 x 619 on the phone), no snapping, the wheel slides it sideways. Pass.                                                                                                                                                                                                                                                                                                                                   |
| Changing layout keeps the page                     | From page 12 through `Pages`, `Strip`, `Scroll`: page 12 in view each time. Pass.                                                                                                                                                                                                                                                                                                                                                                         |
| A long document stays light                        | Whole-document sweeps held at most 4 canvases in `Strip`, 5 in `Pages`, 7 in `Scroll` (at most 4.4 megapixels); the JS heap stayed at 50 to 76 MB with no upward trend. Pass.                                                                                                                                                                                                                                                                             |
| Remembered across PDFs and sessions                | The `Hebrew` file followed the device layout; after reloading the app both files and the device layout were as left. Pass.                                                                                                                                                                                                                                                                                                                                |
| A file with its own layout                         | With the device on `Pages`, file A set to `Strip` opened as `Strip` (also after reopening the app) while the `Hebrew` file opened as `Pages`. Pass.                                                                                                                                                                                                                                                                                                       |
| Following the device again                         | `Use the device layout` returned file A to the device layout and removed `pdfLayout` from the stored source. Pass.                                                                                                                                                                                                                                                                                                                                        |
| A device change does not touch a file's own layout | Changing the device layout to `Scroll` with the switch off left file A on `Strip`; the sheet said "Device layout changed to Scroll. This file keeps its own layout."; the `Hebrew` file moved to `Scroll`. Pass.                                                                                                                                                                                                                                          |
| Unreadable stored value                            | A device value and a source value of `carousel` were both ignored: the file opened in `Scroll`, still loaded, and the bad field was dropped when the library was read. Pass.                                                                                                                                                                                                                                                                              |
| Indicator follows reading                          | `Page N of 81` tracked scrolling, keys, and the buttons in every layout. When several pages are in view in a wide `Strip` it names the page under the middle of the view. Pass.                                                                                                                                                                                                                                                                           |
| Ends of the document                               | `Previous page` was disabled on page 1 and `Next page` on page 81. Pass.                                                                                                                                                                                                                                                                                                                                                                                  |
| Keyboard                                           | Two right arrows and one `Page Up` from page 12 gave page 13 (also at 1200 px). Pass, with the focus caveat in task 6.8.                                                                                                                                                                                                                                                                                                                                  |
| Zoom in `Pages`                                    | Snapping on at or below 100%, off at 125%, on again at 100% with the page kept; a release 40% into a slot settled on the page. Pass.                                                                                                                                                                                                                                                                                                                      |
| Gestures in the strip                              | Pinch and `Ctrl` + wheel kept the page point under the fingers (see task 4.2). Pass.                                                                                                                                                                                                                                                                                                                                                                      |
| Rotating (a width change)                          | **Failed, then fixed.** Turning the phone sideways crosses the viewer's compact-height limit, which swaps the layout tree and draws the surface again from the top, so a reader on page 31 landed on page 1 in `Pages`. The viewer now passes the last reported page to the surface, which opens on it. After the fix, page 31 stayed in `Pages` (portrait to landscape and back), page 20 in `Scroll`, and `Strip` kept its page through a resize. Pass. |

Limits and observations:

- **Touch swipe snapping is not verified on a real touch fling.** The pane's pointer events arrive as mouse events, and a mouse drag does not scroll. Snapping was verified by dropping the scroll position 40% into a slot, by the wheel and keys, and by the CSS the browser applies to touch (`scroll-snap-type: x mandatory`, `scroll-snap-stop: always`); a check on a real phone or tablet is task 6.11.
- A portrait phone shows only part of a `Strip` page at 100% (the page is 438 px wide in a 335 px viewer, because it is fitted to the height); this is the design.
- In `Pages` on the phone the toolbar wraps to two rows and shortens the page area (task 6.7).
- The wide landscape `Strip` keeps up to 14 small canvases (the lookahead is 150% of the viewer width on each side, and the pages are narrow), which is still tiny.

## Risks / Trade-offs

- [Zoom changes still redraw every canvas, and zooming out from 400% blocks the main thread for about a second] -> The preview-and-coalesce work in the earlier change (its task 6.3) lands first; this change reuses it and adds no new full redraw paths. Layout changes are rare, user-initiated, and may redraw once.
- [`scroll-snap` behaves differently across browsers, especially with programmatic scrolling and after a layout change] -> Snapping is turned off while scrolling programmatically and on again after, and verified in the browser pane at phone and desktop widths; a failure falls back to `Strip` behavior without snapping.
- [A page that is much wider than tall fits poorly in a portrait phone in `Pages`] -> The page is fitted whole, so it appears small but complete; the zoom controls and double tap enlarge it, which is the same trade-off as `Scroll`.
- [The page indicator needs scroll position at frame rate] -> It reads scroll offsets in one throttled handler and only sets state when the page number changes.
- [A new field on a stored source must not break older data or older app versions] -> The field is optional, an unknown value is dropped on read, and a library without it reads as "no override"; an older app ignores the extra field.
- [Two open changes edit the `track-sheet-music` spec] -> This change's requirements are all ADDED and do not touch the zoom requirement; archive `save-blocked-sheet-music-links-to-drive` first.

## Migration Plan

1. The layout model, preference store, and their specs land first with no visible change.
2. The renderer adopts the model for `Scroll` with the layout parameter defaulting to `Scroll`, so existing behavior is verified unchanged before the other layouts exist.
3. `Strip`, then `Pages`, then the control, indicator, and keyboard.
4. Rollback: hide the `Layout` control; the stored preference and any sources' `pdfLayout` are ignored, and PDFs open in `Scroll` as today. A stored `pdfLayout` is harmless data and does not need removing.

## Open Questions

- **Right-to-left documents.** Some PDFs (for example Hebrew documents) are read right to left, and a PDF can declare its page direction. This change keeps left-to-right order in `Pages` and `Strip` and treats honoring a declared right-to-left direction as a follow-up. Confirm with the owner whether any scores they use are right to left.
- **The override switch.** The design uses an `Only for this file` switch in the layout sheet. An alternative is two actions (`Use for all PDFs`, `Use for this file`), which is more explicit but adds a tap. Try the switch first and revisit after use.
- **Icons.** Decided with the owner at task 3.1: `Rows` for `Scroll`, `File` for `Pages`, `Columns` for `Strip`; the toolbar button shows the glyph of the layout in use (`pdf-layout-*` names in `app-icon`).
- **Page indicator interaction.** Should tapping the indicator open a `Go to page` entry? Left out here; decide after using it.
- **`Pages` default zoom for very wide pages** (landscape scores on a portrait phone): fit whole (small) or fit width (needs panning)? This design fits whole; revisit after trying real scores.
