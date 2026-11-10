## 1. Approval

- [x] 1.1 Review `mockups/landscape-mobile-layout.html` and this proposal; approved as drawn (600/500 thresholds, side rail, tool panel takes the Now Playing pane's place while open)
- [x] 1.2 Capture the app at 844 × 390 with `tools/browser-session/capture-landscape-views.ts` and extend the mock (Recents, Add, playback tabs, side sheets, practice tools, viewers, composites)
- [ ] 1.3 Approve the additions to the mock (four-entry rail, header add button, side sheets, compact piano with full screen, tabbed playback view)

## 2. Part 1: fill the viewport

- [ ] 2.1 Browser scenario (failing first): rotate to a landscape phone size; the shell fills the viewport and no edge shows a non-app colour
- [ ] 2.2 Web root fills the dynamic viewport with the app background; `viewport-fit=cover`
- [ ] 2.3 Safe-area insets on all edges (`safe-area-insets.web.ts` plus native sibling), applied to the shell, dock and sheets
- [ ] 2.4 Re-measure on rotation so the layout settles without a scroll

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

- [ ] 4.1 Manual check on an iPhone as a home-screen web app in both orientations
