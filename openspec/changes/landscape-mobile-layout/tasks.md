## 1. Approval

- [x] 1.1 Review `mockups/landscape-mobile-layout.html` and this proposal; approved as drawn (600/500 thresholds, side rail, tool panel takes the Now Playing pane's place while open)
- [x] 1.2 Capture the app at 844 × 390 with `tools/browser-session/capture-landscape-views.ts` and extend the mock (Recents, Add, playback tabs, side sheets, practice tools, viewers, composites)
- [ ] 1.3 Approve the additions to the mock (four-entry rail, header add button, side sheets, compact piano with full screen, tabbed playback view)

## 2. Part 1: fill the viewport

- [x] 2.1 Browser scenario (failing first): rotate to a landscape phone size; the shell fills the viewport and no edge shows a non-app colour (written; fails on html/body background and `viewport-fit=cover`, passes root size and scroll in Chromium)
- [x] 2.2 Web root fills the dynamic viewport with the app background; `viewport-fit=cover` (`public/index.html` template: app background on html and body, `100dvh` with a `100%` fallback, `viewport-fit=cover`; `web-entry-html.spec.ts` keeps the colour in step with the theme)
- [x] 2.3a Sheets, dialogs and the playback overlay keep clear of the safe areas. They render outside the shell's `SafeAreaView` (a Modal, or an absolutely positioned overlay), so the iPhone check showed rows and the dismiss button under the Dynamic Island. New `SafeAreaFrame` (`components/safe-area-frame`), used by `ModalSurfaceBase` (every bottom sheet and centered dialog) and the playback overlay; the backdrop still reaches the screen edges. Browser scenario `landscape-safe-areas` uses Chromium's safe-area emulation to check the options sheet and the playback sheet (failed before, passes now)
- [x] 2.3b The full-screen Modals that did not go through `ModalSurfaceBase` keep clear of the safe areas: lyrics reading mode, the sheet music viewer (both layouts) and the full Pitch view use the new `SafeAreaScreen` (the app background behind the inset strips, since an opaque Modal is white on the web); the queue's Move to position dialog and the playlist removal snackbar use `SafeAreaFrame` with their scrim still full-bleed. Scenario `landscape-safe-area-viewers` covers all five in Chromium with emulated insets
- [ ] 2.3c The bottom dock band (mini-player and tab bar, and later the rail) paints its colour under the side and bottom insets so it reaches the screen edges while its content stays inset
- [ ] 2.4 Re-measure on rotation so the layout settles without a scroll (check on the device first: the iPhone check after 2.2 showed no stale layout, so this may need nothing)

## 3. Part 2: landscape layout (after approval)

- [ ] 3.1 `getLayoutClass` model with hysteresis and `useLayoutClass`, with specs
- [ ] 3.2 `WideShortShell` with the four-entry vertical rail; Library add button as a header action
- [ ] 3.3 Now Playing pane in place of the mini-player
- [ ] 3.4 Two-column playback sheet with Lyrics, Queue, Shaping and Mix tabs
- [ ] 3.4a `AdaptiveSheet`: bottom sheet in compact, trailing side sheet in wide-short, for the track menu, add to playlist, account menu and other bottom sheets
- [ ] 3.5 Practice dock `side` placement (pitch, recording, piano)
- [ ] 3.5a Piano full screen: `presentation` prop, remembered preference, slim bar with auto-hide, playing chip, with specs and a browser scenario
- [ ] 3.6 Sheet-music and lyrics viewers use the full height
- [ ] 3.7 Keyboard-safe inputs on the web
- [ ] 3.8 Landscape device profile and scenarios for navigation, the pane and the practice tools
- [ ] 3.9 README layout section

## 4. Verification

- [ ] 4.1 Manual check (after 2.2, on an iPhone in Safari and as a home-screen app in landscape: the white bands are gone; the tab bar band stops at the safe-area insets) on an iPhone as a home-screen web app in both orientations

## Follow-ups

- [ ] F.1 Mixed Hebrew and Latin text in the playback sheet subtitle renders in the wrong order (`of 20 13 · אור-פנד-לנד-2026-12-09`, right-aligned and reversed). Seen on an iPhone in the playback sheet for a track whose folder or name contains Hebrew; the title is fine. Probably needs bidi isolation (`dir="auto"` or Unicode isolates around the name) in the subtitle; check the other places that join a position, a folder and a name into one string.
