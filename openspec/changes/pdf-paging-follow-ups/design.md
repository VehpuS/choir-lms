## Context

`pdf-horizontal-paging` (archived) added `Scroll`, `Pages`, and `Strip` to the web PDF viewer around a pure layout model (`renderers/pdf-layout-model.ts`) and the renderer `pdf-renderer.web.ts`. Its browser verification (Decision 8 of that design) found rough edges that were deliberately left for a conversation with the owner. That conversation happened on 2026-10-26; this design turns the decisions in the proposal into approaches. Go to page and thumbnails (`pdf-go-to-page`) is a separate change; the repository split was done directly.

## Goals / Non-Goals

**Goals:**

- Layout changes land on a fitted page; arrow keys keep working after toolbar use; the phone toolbar fits one row in `Pages`; `Pages` has no sideways scrollbar; page turns animate briefly; a wide window can show two pages.

**Non-Goals:**

- Right-to-left order (deferred until a real file needs it), native PDF layouts (waits on `native-playback-follow-ups` 1.6), Go to page and thumbnails.

## Decisions

### 1. Zoom resets to fit on a layout change

The viewer's layout setter records the page and in-page fraction (existing anchor, archived Decision 3), sets zoom to 1, and re-lays out. Zoom stays one number; nothing is stored per layout.

- **Alternative: remember zoom per layout.** More state and a surprise when returning; the owner chose the reset.

### 2. Focus returns to the page area

The surface host (which owns the key handler, archived Decision 6) exposes a `focus()` the viewer calls when a sheet closes and after a toolbar action. A small pure rule decides whether to take focus: never when the active element is a text field or content-editable. Handlers stay on the host rather than moving to the document.

- **Alternative: listen at the viewer level.** Rejected by the owner: broader listeners risk fighting other controls.

### 3. Toolbar: page controls move beside the indicator

`Previous page` and `Next page` leave the toolbar and sit beside the page indicator label (shown in every layout; the buttons only in `Pages` and `Spread`). The toolbar keeps zoom, `Layout`, piano, and play. How the compact landscape side rail holds the indicator and page buttons is not decided; see Open Questions.

### 4. Scrollbar

`Pages` and `Spread` set the host's scrollbar to hidden (`scrollbar-width: none` and the WebKit pseudo-element); `Strip` and `Scroll` are unchanged. Hiding is applied with the layout, so switching layout restores it.

### 5. Smooth page turns

Control and key turns call `scrollTo({ left, behavior })` with `smooth` unless `matchMedia('(prefers-reduced-motion: reduce)')` matches. Mandatory snapping can fight a programmatic smooth scroll, so the renderer suspends snap while a turn runs and restores it at the end (or on a timeout of about 300 ms if the scroll end event is missed). A turn started during another recomputes from the newest target. The reduced-motion check lives in a small pure function taking the media query result so it can be specified without a browser.

Built as `pdf-page-turn.ts`. When the settle timer fires, the turner first puts the view on the target (a no-op when the slide arrived) and then restores snapping, so a slide slower than the timer, or one that never ran, cannot snap back to the old page. Only keys and the `Previous page` and `Next page` buttons slide; the wheel, a swipe, and `Go to page` (a jump of many pages) stay instant. The renderer reports the pending target (`pendingPage`) so quick repeated key presses add up. Verified in the browser pane for end states (one press, three quick presses, two back; snapping off during the turn and on after). The pane reports the page as hidden, so the look of the ~200 ms slide and the reduced-motion path still need a look in a foreground browser with the owner.

### 6. Wheel in Pages stays one page per flick

No behavior change decided. The threshold and pause stay as shipped; tune them with the owner in the browser preview (task 6.1).

### 7. Spread layout

A fourth layout in `pdf-layout-model.ts`. Slots are as wide as the container, each holding two pages side by side, fitted whole (the smaller of the width fit and the height fit with a shared height), centered. Page 1 pairs with page 2. An odd last page sits alone in its slot. The model gains the spread index of a page and the page range of a spread, so page tracking, scroll-to-page, the lazy-drawing margin (the current spread and one neighbor each side), and the layout-change anchor all use one set of boxes, as in archived Decision 1.

- **Paging steps by spread.** Arrow keys, `Page Up/Down`, and the page buttons move one spread. The indicator reads `Pages 3-4 of 81` for a spread, and `Page 81 of 81` for a lone last page.
- **Availability.** A pure `isSpreadAvailable(containerWidth, containerHeight)` returns true when two fitted pages would each be at least a minimum readable width. The value is an Open Question. When false, the Layout sheet omits `Spread`, and a stored `spread` resolves to `Pages` without being rewritten, so the choice returns when the window is wide again. `resolvePdfLayout` keeps returning the stored layout; the viewer applies the width fallback, since only it knows the container size.
- **Storage.** `PdfLayout` in `@org/audio-library-models` gains `spread`. Old data is unaffected, and an app that does not know `spread` (an older build) drops it as an unknown value, per the existing rule.
- **Why opt-in, not automatic in `Pages`:** the owner wants the meaning of `Pages` to stay one page at a time.
- **Zoom** follows Decision 1 and the existing rules: 100% fits the spread to the viewer, snapping only while fitted.

## Risks / Trade-offs

- [Smooth scroll fights snap] → suspend snap during the turn and restore it at the end, with a timeout fallback; check in the browser at several widths.
- [Focus return steals focus from assistive technology users] → only move focus after sheet close and toolbar actions the user started, never from a text field, and keep the page area focusable with an accessible name.
- [Spread on a wide window makes pages small] → the availability threshold, and the user can still pick `Pages`.
- [Older app builds reading a stored `spread`] → unknown values are ignored today, so they fall back to the device layout, then `Scroll`.
- [Landscape rail has little room] → open question below, explored before building 3.x.

## Open Questions

- The minimum readable width per page for `Spread` (a first guess is 360 px per page, so a viewer of at least about 760 px wide, and a landscape-ish aspect). Settle by trying real widths.
- How the compact landscape side rail holds the page indicator and page buttons.
- Whether `Spread` should offer a "first page alone" pairing later (the owner chose pairing from page 1 for now).
