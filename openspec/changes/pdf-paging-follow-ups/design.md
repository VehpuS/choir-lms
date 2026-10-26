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

Built as `pdf-page-turn.ts`. The end of a slide is read from the scroll itself, because browsers set its length (about 350 ms for one page in Chrome, over 700 ms for three) and a fixed timer either cut a long slide short or let it overshoot: snapping returns on `scrollend`, or 150 ms after the last scroll event, and a 700 ms stall timer (which also puts the view on the target) covers a slide that never starts, such as a page that is not painting. Writing the offset while a slide moves does not stop it, so a moving slide is never written to. Only keys and the `Previous page` and `Next page` buttons slide; the wheel, a swipe, and `Go to page` (a jump of many pages) stay instant. The renderer reports the pending target (`pendingPage`) so quick repeated key presses add up. Verified in a foreground browser tab: one press, three quick presses, and two back all land exactly on their pages with snapping off during the slide and on after. The reduced-motion path is covered by specs only (the browser pane cannot emulate the setting); see task 6.4.

### 6. Wheel in Pages stays one page per flick

No behavior change. The owner tried the shipped threshold (about two notches) and pause (350 ms) with a wheel and a trackpad on 2026-10-26 and found the feel right (task 1.1).

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

- Settled (2026-10-26, owner): `Spread` needs 360 px per page, so `isSpreadAvailable` is true from a viewer width of 760 px (two pages plus margins). Width only; no aspect rule unless 4.6 shows one is needed. Tune with real widths in 4.6.
- Settled (2026-10-26, owner): the compact landscape side rail keeps the page controls. `Previous page` and `Next page` sit in the rail with a small `n/81` label between them (a short form of the indicator, shown only in `Pages` and `Spread`); the indicator pill over the page is not used in the rail. On a short phone the rail scrolls rather than hiding a control (built in 3.2; before it, play and piano were cut off below a 375 px screen). The rail's order is close, page group, zoom, `Layout`, piano, play.
- Whether `Spread` should offer a "first page alone" pairing later (the owner chose pairing from page 1 for now).
