## Why

The web sheet music viewer shows a PDF only as one long column of pages to scroll down. A singer reading a part from a phone held sideways, or from a tablet on a stand, turns pages the way they would in a part book: one page at a time, side to side, with the whole page visible at once. Scrolling a column also loses your place between pages. The viewer already scrolls MusicXML staves sideways, so horizontal movement is familiar, but a PDF cannot do it.

## What Changes

- A PDF opened in the web viewer can be shown in one of three layouts, chosen from a new `Layout` control in the viewer:
  - `Scroll`: today's vertical column of pages, fitted to the width (the default).
  - `Pages`: one page at a time, fitted whole to the viewer, turned by swiping, the arrow keys, or `Previous page` and `Next page` buttons, snapping to each page.
  - `Strip`: all pages side by side in one row that scrolls sideways, each fitted to the viewer's height, with no snapping.
- The chosen layout is remembered for the device and applied to every PDF the next time one opens.
- A single file can have its own layout that overrides the device choice, because the right layout sometimes depends on what the file contains (a wide landscape score reads better as a `Strip`, a one-page part as `Scroll`). The override is saved on that sheet music source, like its part selection, and can be cleared to follow the device choice again.
- A page indicator (`Page 3 of 81`) shows in every layout, so a singer always knows where they are, and changing layout keeps the same page in view.
- Zoom, pinch, wheel zoom, and double tap keep working in every layout. In `Pages` the page snaps only while it is fitted; once zoomed in, it pans freely, and fitting again returns to snapping.
- Native iOS and Android are unchanged (they still open a PDF outside the app, `native-playback-follow-ups` 1.6).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `track-sheet-music`: the PDF viewer gains selectable layouts, a remembered device preference with a per-file override, a page indicator with page-to-page movement, and defined zoom behavior in each layout.

## Impact

- `packages/audio-library-models`: the `PdfLayout` type and a `pdfLayout` field on a sheet music source, read and validated with the rest of the source.
- `packages/audio-library-runtime`: saving or clearing a source's layout through the existing sheet music update path (the same one that saves a part selection).
- `packages/mobile-rehearsal-player` (web only): the PDF renderer (`renderers/pdf-renderer.web.ts`) and its layout math (`renderers/pdf-page-layout.ts`) gain a layout, page tracking, and page-to-page movement; the viewer gets a layout control, page indicator, and keyboard handling; a device-wide layout preference is stored the way the `My parts` preference is.
- Depends on change `save-blocked-sheet-music-links-to-drive`, which adds the PDF zoom gestures and the 400% PDF maximum this change builds on. That change should be archived first so its `track-sheet-music` requirements are in the main spec before this change's are applied.
- No new dependencies, keys, or network use. Icons for the layout control may add glyph entries to `app-icon` (to confirm with the owner, see design).
