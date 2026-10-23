## Context

The web PDF renderer (`renderers/pdf-renderer.web.ts`) draws every page into a vertical flex column. Each page wrapper gets its final size up front (`pdf-page-layout.ts`: width = container width x zoom, height from the page's aspect ratio), so the scroll length is right, and an `IntersectionObserver` draws only pages near the viewport (a margin of 150% above and below) and releases the rest. Zoom changes release every canvas and lay the column out again. The viewer owns zoom (`useViewerZoom`) and, since change `save-blocked-sheet-music-links-to-drive`, PDFs zoom to 400% and respond to pinch, `Ctrl`/`Cmd` + wheel, and double tap through `attach-pdf-zoom-gestures.web.ts`, which keeps the point under the fingers fixed by scaling the scroll offsets by the content's measured size ratio.

Measurements from that change (design Decision 8 there) matter here: an 81-page Drive score holds only 2 to 5 canvases at a time, zoom steps redraw in about half a second, and zooming out from 400% blocks the main thread for about a second. MusicXML staves already scroll sideways as one strip, so the viewer and its toolbar already handle a horizontally scrolling surface.

Constraints: web only (native has no PDF renderer), no new dependencies, the 300-line file guideline, pure layout math with specs and thin DOM code, and the zoom range and gestures must keep working unchanged in `Scroll`.

## Goals / Non-Goals

**Goals:**

- Three layouts (`Scroll`, `Pages`, `Strip`) from one control, remembered per device.
- A page indicator and page-to-page movement, including the keyboard.
- Changing layout, zooming, and resizing keep the reader on the same page.
- Pages stay lazily drawn in every layout.

**Non-Goals:**

- Native rendering or a native layout control.
- Two-page spreads (facing pages), or a different layout per document.
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

### 5. The preference is a device-wide store

A small store (`pdf-layout-store.ts`, `pdf-layout-storage.ts`) follows the `My parts` pattern: a module-level value shared through `useSyncExternalStore`, restored once from async storage under `choirlms.sheet-music.pdf-layout`, validated on read (an unknown value is `Scroll`), and written on change. It is read by the viewer and passed to the surface, so no source or track stores it.

### 6. Controls and indicator

A single `Layout` toolbar button opens the app's existing options sheet with three choices (`Scroll`, `Pages`, `Strip`), the current one marked, instead of three more toolbar buttons: the toolbar already holds zoom, fit, go to, piano, and play, and a phone held sideways moves them into a narrow rail. In `Pages` the toolbar also shows `Previous page` and `Next page`. The page indicator (`Page 3 of 81`) is a small label over the surface in every layout, updated from scroll position with the layout model's page-at-point function, throttled to a frame. It is not interactive in this change.

The keyboard handler lives on the surface's host element and is active only while a PDF is open: left and right arrows and `Page Up` and `Page Down` move a page in `Pages` and `Strip`; in `Scroll` only `Page Up` and `Page Down` and the arrows keep their browser scrolling behavior.

### 7. Wheel and trackpad behave sensibly sideways

In `Strip` and `Pages` at fitted zoom there is nothing to scroll vertically, so a plain vertical mouse wheel scrolls sideways (the vertical delta is applied to the horizontal offset). A trackpad's horizontal swipe already scrolls sideways and is left alone. `Ctrl`/`Cmd` + wheel keeps zooming.

## Risks / Trade-offs

- [Zoom changes still redraw every canvas, and zooming out from 400% blocks the main thread for about a second] -> The preview-and-coalesce work in the earlier change (its task 6.3) lands first; this change reuses it and adds no new full redraw paths. Layout changes are rare, user-initiated, and may redraw once.
- [`scroll-snap` behaves differently across browsers, especially with programmatic scrolling and after a layout change] -> Snapping is turned off while scrolling programmatically and on again after, and verified in the browser pane at phone and desktop widths; a failure falls back to `Strip` behavior without snapping.
- [A page that is much wider than tall fits poorly in a portrait phone in `Pages`] -> The page is fitted whole, so it appears small but complete; the zoom controls and double tap enlarge it, which is the same trade-off as `Scroll`.
- [The page indicator needs scroll position at frame rate] -> It reads scroll offsets in one throttled handler and only sets state when the page number changes.
- [Two open changes edit the `track-sheet-music` spec] -> This change's requirements are all ADDED and do not touch the zoom requirement; archive `save-blocked-sheet-music-links-to-drive` first.

## Migration Plan

1. The layout model, preference store, and their specs land first with no visible change.
2. The renderer adopts the model for `Scroll` with the layout parameter defaulting to `Scroll`, so existing behavior is verified unchanged before the other layouts exist.
3. `Strip`, then `Pages`, then the control, indicator, and keyboard.
4. Rollback: hide the `Layout` control; the stored preference is ignored, and PDFs open in `Scroll` as today.

## Open Questions

- **Right-to-left documents.** Some PDFs (for example Hebrew documents) are read right to left, and a PDF can declare its page direction. This change keeps left-to-right order in `Pages` and `Strip` and treats honoring a declared right-to-left direction as a follow-up. Confirm with the owner whether any scores they use are right to left.
- **Icons.** The layout control needs a glyph, and each choice may want one. `app-icon` has no matching glyphs yet; adding Phosphor entries changes the app's icon set, so choose them with the owner at the first checkpoint (the `music-ui-iconography` and `ui-consistency` guidance applies).
- **Page indicator interaction.** Should tapping the indicator open a `Go to page` entry? Left out here; decide after using it.
- **`Pages` default zoom for very wide pages** (landscape scores on a portrait phone): fit whole (small) or fit width (needs panning)? This design fits whole; revisit after trying real scores.
