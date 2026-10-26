## Why

`pdf-horizontal-paging` shipped the `Scroll`, `Pages`, and `Strip` layouts on web. Its verification and review left open UX questions and follow-up work that were deliberately kept out of that change. They need a user conversation before any code, so they are recorded here instead of being dropped when that change is archived.

## What Changes

Each item starts as an exploration with the owner; the decision becomes a spec delta, design note, and task before implementation. Items are numbered by their original task in `pdf-horizontal-paging` (section 6).

Explore with a user before changing:

- **6.10 Zoom across layouts.** Zoom is one number shared by every layout. Zoomed to 150% in `Scroll`, switching to `Pages` shows a zoomed page with no snapping until zoom returns to 100%. Decide: reset to the new layout's fit, or keep the zoom.
- **6.8 Keyboard focus.** Keys work only while the page area has focus (design Decision 6). After a toolbar button or the `Layout` sheet, the arrow keys do nothing until the page is clicked. Options: return focus to the page after a sheet closes or a toolbar button is used, or listen at the viewer level while no text field is focused.
- **6.7 Phone toolbar in `Pages`.** Zoom, `Layout`, `Previous page`, `Next page`, piano, and play no longer fit one row; the piano button wraps and shortens the page area. Try a more compact arrangement (page controls beside the indicator, fewer controls in the main row) and decide how the compact landscape side rail holds them.
- **6.5 Horizontal scrollbar** under `Pages` and `Strip`: keep it, hide it in `Pages`, or replace it with the page indicator.
- **6.6 Smooth page turns.** `Previous page`, `Next page`, and arrow keys jump instantly; try a short smooth scroll, and whether it follows the device's reduced-motion setting.
- **6.9 Wheel paging in `Pages`.** One page per flick (design Decision 7); check the threshold and pause feel with a mouse wheel and a trackpad.
- **6.1 Right-to-left page order** for documents that declare it (design Open Questions).
- **6.2 `Go to page`** entry from the page indicator, and page thumbnails. Moved to `pdf-go-to-page`.
- **6.3 Two-page spreads** on a wide tablet or desktop window.

Other follow-up work:

- **6.4 Native.** Add the layouts and page paging to native when native PDF rendering exists (`native-playback-follow-ups` 1.6).
- **6.11 Real touch-fling check** of swipe snapping in `Pages` on a phone and a tablet (the browser pane cannot produce one): a fast fling must not skip a page, and a slow drag must settle on the nearer page.
- **6.12 Lint warning.** Done directly (2026-10-26): list helpers moved into `loop-playlist-storage.ts`, file now 260 lines.

## Decisions so far

- **6.10:** a layout change resets zoom to the new layout's fit.
- **6.8:** return focus to the page area after a sheet closes or a toolbar button is used (handlers stay on the host).
- **6.7:** move `Previous page`/`Next page` beside the page indicator, leaving zoom, `Layout`, piano, and play in the main row; the compact landscape rail still needs a decision.
- **6.5:** hide the horizontal scrollbar in `Pages`, keep it in `Strip`.
- **6.6:** a short (~200ms) smooth scroll for page turns, instant when the device asks for reduced motion.
- **6.9:** keep one page per wheel flick; tune the threshold and pause by feel in the browser with the owner.
- **6.2:** moved to its own change, `pdf-go-to-page` (page-number field above a thumbnail grid, opened from the page indicator).
- **6.3:** an opt-in fourth layout, `Spread`, offered in the Layout sheet only when the window is wide enough (never automatic). Pages pair from page 1 (1-2, 3-4). Details such as the width threshold and how paging steps (by spread) are for design.
- **6.1:** deferred until a real right-to-left file needs it; stays recorded, no work planned.

## Capabilities

### New Capabilities

None yet. Exploration decides which items change requirements.

### Modified Capabilities

- `track-sheet-music`: expected for the items that change viewer behavior (6.1 to 6.3, 6.5 to 6.10); adds `Spread` and the zoom, focus, scrollbar, and page-turn rules below.

## Impact

- `packages/mobile-rehearsal-player` PDF viewer (`renderers/pdf-*`, toolbar, `Layout` sheet) and its specs.
- No dependency or data-model changes expected.
