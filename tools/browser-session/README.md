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
- `scenario-runner.ts` — `runScenario({ library, steps })` opens the session,
  gives the steps `page`, `shot`, `pass` and `session.readStored(key)` (what the
  app persisted), and exits non-zero on failure.
- `add-to-playlist-snackbar.scenario.ts` — issue #36.
- `sheet-music-pdf.scenario.ts` — opens a real four-page PDF as a track's sheet music; the score is a web link whose bytes `webFiles` serves (CORS open), so no Drive is needed.
- `track-rename.scenario.ts` — issue #42 (renaming from Tracks and Files, the
  copies prompt, the remembered choice), seeded with
  `buildTrackRenameMockLibrary` (folders and Files copies).

```sh
npm exec -- nx run mobile-rehearsal-player:build
npx tsx tools/browser-session/track-rename.scenario.ts <outDir>
# or every scenario, as automated browser tests (builds first):
npm exec -- nx run mobile-rehearsal-player:browser-test
```

CI runs `browser-test` in its own `browser` job after the `main` job passes
(Chromium comes from `npx playwright install`; `playwright` is a pinned
devDependency). Screenshots land in `browser-session-output/` (ignored).

Tracks show as "unavailable" (no Drive), which is enough for library, playlist
and menu flows; playback needs real audio and is out of scope. To cover another
flow, add a `*.scenario.ts` that builds a library and drives `session.page`.
