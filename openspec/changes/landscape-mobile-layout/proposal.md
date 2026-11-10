## Why

Issue #46. Opened as an iOS home-screen web app and turned sideways, the app renders with horizontal white gaps: the page does not fill the landscape viewport (the visible height and the safe-area insets are not tracked), and the layout is the portrait one stretched wide. It improves a little after scrolling but never settles. Beyond that bug, nothing in the app is shaped for a wide, short screen: the mini-player, tab bar and practice tools stack at the bottom and leave a sliver of content, and moving between Now Playing, the Library and the practice tools means opening and closing full-height sheets.

This change is in two parts. **Part 1** is the immediate visual fix, shipped with the same pull request as this proposal's approval. **Part 2** is a proper landscape layout. Part 2 was approved as drawn in `mockups/landscape-mobile-layout.html` (thresholds, side rail, and tool panels sharing the trailing side with the Now Playing pane); it is built after Part 1.

## What Changes

### Part 1: fill the viewport (immediate fix)

- The web shell fills the visible viewport in landscape and portrait: the root uses the dynamic viewport height, the page background is the app background (no white shows through), and `viewport-fit=cover` is set so the content reaches the screen edges.
- Left, right and bottom safe-area insets (the notch and home indicator in landscape) are applied to the shell, the dock and the sheets instead of only the top.
- Orientation changes re-measure the viewport, so the layout settles without a scroll.

### Part 2: a landscape layout (approved)

- **Layout classes.** The shell chooses a layout from the window, not from the device: `compact` (width under 600, the current layout) and `wide-short` (width of 600 or more and height under 500, a phone on its side). Tablets and desktop widths keep the current layout until a later change.
- **Side rail instead of bottom tabs.** In `wide-short`, Library, Add, Recents and Practice tools (which opens the same tools menu) move to a slim four-entry rail on the leading edge, with the mini-player no longer a band of its own. The Library's add button moves into its header so it never covers a row.
- **Now Playing beside the content.** The mini-player becomes a persistent **Now Playing pane** on the trailing side (title, transport, progress, loop and speed), so the user can browse the Library while it stays visible. The full playback sheet opens as two columns: waveform, transport, speed, pitch, loop and volume on the left, and Lyrics, Queue, Shaping (and Mix for a composite) as tabs on the right, so nothing sits below the fold.
- **Menus and sheets as side sheets.** The track menu, add to playlist, account menu and other bottom sheets open as a trailing side sheet (up to 380 points) that scrolls inside, instead of a short clipped bottom sheet.
- **Practice tools as side panels.** Pitch monitor and recording open as a panel on the trailing side, taking the Now Playing pane's place while open (the pane returns when the tool closes; playback is unaffected), not a strip that takes height. The piano keeps its full-width keyboard at a compact height (about 104 points) at the bottom of the content area, right of the rail. The sheet-music and lyrics viewers get the full height with a collapsible control column.
- **Keyboard-safe.** Text fields in landscape scroll into view above the keyboard rather than being covered.
- Native iOS and Android stay portrait-locked (`orientation: 'portrait'`); Part 2 applies to the web app, and the layout classes are written so unlocking native later needs no new layout work.

Not included: tablet or desktop layouts, new features inside any surface, and unlocking native orientation.

## Capabilities

### Modified Capabilities

- `mobile-rehearsal-player-ui`: viewport fill and safe areas (Part 1), the wide-short layout (Part 2).

## Impact

- `mobile-rehearsal-player`: shell (`routing/shell`), the tab bar and mini-player docks, playback surface, practice tools dock, the sheet-music and lyrics viewers, web entry HTML (viewport meta, root background), a `useLayoutClass` hook and its pure model.
- Browser tooling: `tools/browser-session/capture-landscape-views.ts` captures the app's surfaces at 844 × 390 (used for the mock's section 0), the scenario runner takes a `viewport`, and gains a landscape phone device profile; scenarios for Part 1 (no uncovered edge after rotating) and Part 2 (navigation, Now Playing pane, practice tools in landscape).
- README: the layout section describes the layout classes.
