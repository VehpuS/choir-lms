# Browser session tooling

Drives the Expo web export in a live Chromium (Playwright) with a **mock
library**, so no Google sign-in or Drive access is needed. Works in any remote
session that has the pre-installed browser.

- `mock-library-session.ts` — `openMockLibrarySession({ library })` serves
  `packages/mobile-rehearsal-player/dist-browser-test` (single-page fallback included), seeds
  the library into `localStorage` before the app starts, and returns a
  Playwright `page`.
- Fixtures live in
  `packages/mobile-rehearsal-player/src/test-support/mock-library/` —
  `buildMockSource`, `buildMockPlaylist`, `buildDefaultMockLibrary`. A spec
  keeps the storage keys in step with `@org/audio-library-runtime`.
- `mock-drive-session.ts` — a small mock Google Drive. `drive: { state }` on
  `openMockLibrarySession` / `runScenario` is `'signed-out'` (default), `'expired'`
  or `'authorized'` (with optional `files` and `inaccessibleFileIds`). It seeds the
  app's stored session, answers `googleapis.com/drive/v3/**` locally, and serves a
  stub `accounts.google.com` page so Reconnect can be observed
  (`session.drive.signInRequests`, `.apiRequests`). Extend `MockDriveAccount` and
  the route when a test needs more.
- `scenario-runner.ts` — `runScenario({ library, steps })` opens the session,
  gives the steps `page`, `shot`, `pass` and `session.readStored(key)` (what the
  app persisted), and exits non-zero on failure.
- `add-to-playlist-snackbar.scenario.ts` — issue #36.
- `sheet-music-pdf.scenario.ts` — opens a real four-page PDF as a track's sheet music; the score is a web link whose bytes `webFiles` serves (CORS open), so no Drive is needed.
- `drive-access-banner.scenario.ts` — issue #40, expired session: one single-line
  banner, quiet rows, Reconnect opens sign-in.
- `drive-access-chips.scenario.ts` — issue #40, authorised session: no banner,
  short chips only on the files with a problem.
- `track-rename.scenario.ts` — issue #42 (renaming from Tracks and Files, the
  copies prompt, the remembered choice), seeded with
  `buildTrackRenameMockLibrary` (folders and Files copies).

```sh
npm exec -- nx run mobile-rehearsal-player:build-browser-test
npx tsx tools/browser-session/track-rename.scenario.ts <outDir>   # one scenario, directly
npm exec -- nx run mobile-rehearsal-player:browser-test           # the default lane (builds first)
npm exec -- nx run mobile-rehearsal-player:browser-test --scenario=rename   # only files whose name contains "rename"
npm exec -- nx run mobile-rehearsal-player:browser-test-matrix    # the opt-in lane
```

`run-scenarios.ts` runs scenarios three at a time, runs every one to the end
(a failure does not hide the rest), and prints a timing line each plus a
summary. **Lanes:** `*.scenario.ts` is the default lane, run by CI on every
pull request. `*.matrix.scenario.ts` is for the slow or machine-sensitive
scenarios (device profiles, CPU throttling, sample rates, long tracks); name a
new one that way when it takes more than a few seconds or needs a quiet CPU.
It runs on demand: from the Actions tab (`Browser matrix` workflow), or by
putting the `browser-matrix` label on a pull request.

CI runs `browser-test` in its own `browser` job, alongside the `main` job
(Chromium comes from `npx playwright install`; `playwright` is a pinned
devDependency). Screenshots land in `browser-session-output/` (ignored).

The browser build (`build-browser-test`) is the normal web export with a
placeholder Google web client id, so Reconnect is enabled without real credentials.

Without a `drive` account every saved track is unavailable, which is enough for library, playlist
and menu flows; playback needs real audio and is out of scope. To cover another
flow, add a `*.scenario.ts` that builds a library and drives `session.page`.
