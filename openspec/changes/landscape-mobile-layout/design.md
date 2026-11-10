## Context

The shell (`routing/shell/mobile-shell`) is a column: content viewport, practice dock, mini-player and tab bar as one flush band at the bottom. Sheets are `Modal`s. Everything assumes a tall screen. On a phone on its side the bottom band alone takes about a third of a 390-point height.

## Decisions

### Part 1

- **Dynamic viewport.** The web root (`html`, `body`, `#root`) gets `height: 100dvh` with a `100vh` fallback and the app background colour, so rotation never exposes the default white page. A `viewport-fit=cover` meta tag lets content reach the edges; the shell then pads by `env(safe-area-inset-*)`. React Native Web has no `env()`, so a small web-only `safe-area-insets.web.ts` reads the insets through a hidden CSS-variable probe element and re-reads on `resize` and `orientationchange`. Native keeps `SafeAreaView` (a `.native` sibling returns zeros for left and right while portrait-locked).
- **Settle on rotation.** iOS reports the new size a frame late. The layout hook listens to `resize` plus `orientationchange` and re-measures once after the next animation frame.
- The fix is a browser scenario first: rotate the page to a landscape size and assert the shell's bounds equal the viewport and no element outside the shell paints a non-app colour at the edges.

### Part 2

- **A pure layout model.** `getLayoutClass({ width, height })` returns `compact` or `wide-short`; one function, one hysteresis rule (a 40-point band around the thresholds so a soft keyboard or browser chrome resizing the window does not flip the layout). Everything else reads the class; no screen compares widths itself.
- **Same components, different arrangement.** `MobileShell` picks `CompactShell` (today's) or `WideShortShell`. The destination screens, sheets and practice tools are reused as they are; the wide-short shell only changes where the docks go. This keeps the diff in the shell and avoids a second copy of any screen.
- **Rail.** `shell-tab-bar` gains a `vertical` presentation (icon above a short label, 64 points wide plus the leading safe inset). The destination list and active state are unchanged.
- **Now Playing pane.** A 280-point trailing pane built from the existing mini-player summary model and transport handlers. It replaces the mini-player and, when nothing is playing, collapses so the content uses the full width. Tapping the title opens the full sheet.
- **Two-column playback sheet.** Now Playing, Queue and Shaping stay three surfaces; in wide-short the sheet shows the artwork and transport on the left and the chosen surface on the right, so switching surfaces no longer replaces the controls.
- **Practice tools.** The practice dock takes a `placement` of `bottom` (compact) or `side` (wide-short). The piano keeps its full-width keyboard by scrolling horizontally, which is natural in landscape; the pitch strip and recording strip stack in a trailing column beside the content.
- **Keyboard.** The existing sheets use `KeyboardAvoidingView` on native; on the web the layout hook exposes `visualViewport.height` so inputs scroll above the keyboard.
- **Nothing is hidden by the layout.** Every action reachable in compact is reachable in wide-short, in the same overflow menus.

### Mock

`mockups/landscape-mobile-layout.html` is a standalone page (no build, no network) that draws the iPhone landscape viewport at 844 × 390 with the app's colours: the current bug, then the proposed Now Playing, Library and practice-tool arrangements, plus the layout-class thresholds. It is a design reference like the other `mock.html` files in `openspec/changes/`, not shipped code.

## Approved decisions

Approved on issue #46 against the mock:

- Thresholds stay at 600 wide and 500 high, with the 40-point hysteresis band.
- Landscape navigation is the side rail, not bottom tabs.
- The Now Playing pane and the practice tools share the trailing side: a tool panel takes the pane's place while it is open, and the pane returns when the tool is closed. Playback keeps running and the rail still reaches the full playback view.

Part 2 is cleared to build after Part 1 ships, one task at a time.

## Risks

- Safe-area probing differs across iOS versions; the scenario profile uses explicit insets, and a manual check on a device is a verification task.
- Thresholds are a judgement call; the layout model keeps them in one place so they are cheap to change after a device check.
