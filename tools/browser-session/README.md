# Browser session tooling

Drives the Expo web export in a live Chromium (Playwright) with a **mock
library**, so no Google sign-in or Drive access is needed. Works in any remote
session that has the pre-installed browser.

- `mock-library-session.ts` — `openMockLibrarySession({ library })` serves
  `packages/mobile-rehearsal-player/dist` (single-page fallback included), seeds
  the library into `localStorage` before the app starts, and returns a
  Playwright `page`.
- Fixtures live in
  `packages/mobile-rehearsal-player/src/test-support/mock-library/` —
  `buildMockSource`, `buildMockPlaylist`, `buildDefaultMockLibrary`. A spec
  keeps the storage keys in step with `@org/audio-library-runtime`.
- `add-to-playlist-snackbar.scenario.ts` — example scenario (issue #36).

```sh
npm exec -- nx run mobile-rehearsal-player:build
npx tsx tools/browser-session/add-to-playlist-snackbar.scenario.ts <outDir>
```

Tracks show as "unavailable" (no Drive), which is enough for library, playlist
and menu flows; playback needs real audio and is out of scope. To cover another
flow, add a `*.scenario.ts` that builds a library and drives `session.page`.
