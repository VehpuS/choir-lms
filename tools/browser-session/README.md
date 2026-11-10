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
- `mock-library-entities.ts` (same folder as the fixtures) — builders for what a
  scenario seeds beyond tracks: `buildMockLoop`, `withMockPlaylistItems`,
  `withMockTags`, `buildMockMarker`, `buildMockLyrics`, `buildMockComposite`,
  `buildMockRecording`. Put loops and composites on `MockLibrary`; pass
  `recordings` to the session (seeded into IndexedDB, records only, no audio).
  A spec reads them back through the real runtime, so they stay in step with it.
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
- `page-helpers.ts` — `openTab`, `waitForTrack`, `openTrackMenu`, `chooseMenuItem`,
  `expectToast`; and `session.expectNoConsoleErrors(ignore?)` (opt in per step;
  a short baseline of known errors is ignored). A failing scenario also writes
  `failure-trace.zip` (`npx playwright show-trace <file>`) and
  `failure-console.txt` next to `failure.png`; CI uploads them with the screenshots.
- `shell-navigation.scenario.ts` — tabs, Library chip and Files folder kept, reload, phone and desktop layout.
- `library-files-organize.scenario.ts` / `library-files-bulk.scenario.ts` — Files search, create folder, move, delete with confirmation; selection bar, bulk Add to playlist, and the remembered "Include playlists?" choice.
- `playlists.scenario.ts` — create, rename, reorder, remove with Undo, delete with confirmation, and finding a played playlist in Recents.
- `media-probe.ts` — `mediaProbe: true` on the session records the media elements the app plays; `readMediaState(page)` returns the latest one's `currentTime`, `paused`, `playbackRate` and `duration` (the player's element is outside the DOM).
- `loops.scenario.ts` — make a loop, trim it with the steppers, see it under its track and in Loops, edit it, and play it from its start (with a whole-track control).
- `playback.scenario.ts` / `playback-long-track.scenario.ts` — play, pause, seek, the queue (next, previous, reorder, shuffle), speed and pitch (readout, player rate and audio clock agree), and a ten-minute track.
- `playback-slowdown-quality.matrix.scenario.ts` — measures the audio the player produces at 1x, 0.75x, 0.5x, 0.25x and +2 semitones on three device profiles (`captureMediaOutput` for speed, the audio tap for the pitch shifter), against baseline-plus-margin thresholds. Slow: matrix lane.
- The mock Drive answers file listings the way Drive does for two parts of the query: `'<id>' in parents` (a file with no `parents` is in the root) and `name contains '<text>'` (case-insensitive, any folder); `session.drive.listQueries` records every `q`. Give `files` objects with `id`, `name`, `mimeType`, `size`, `parents`.
- `tags.scenario.ts` / `library-filters.scenario.ts` / `drive-add-browse-search.scenario.ts` — edit, view and remove tags and see them in Tags and Recents; search scope and the Any/All tag filter; browse, open a folder and search in the Add tab. `visibleText(page, text)` picks the visible element, since screens stay mounted behind the one in front.
- The mock Drive also answers a single-file request (`files/<id>`) with the matching object from `files`, which the import needs to read a file's name and type.
- `drive-import.scenario.ts` / `drive-offline-and-session.scenario.ts` — save from the Add tab, select and review an import (counts, Flatten, already in the library), confirm; Keep offline (downloaded once, played from the kept copy, with a not-kept control), Offline files and Clear all, and Forget session. Reconnect after an expired session is in `drive-access-banner.scenario.ts`.
- `mock-lyrics.ts` — `lyricsLookup: [...]` on the session answers the app's Look up (LRCLIB, `lrclib.net/api/search`) with the given candidates; `session.lyricsSearches` records what was searched.
- `markers.scenario.ts` / `lyrics.scenario.ts` — add, rename, jump to, loop between and delete markers; view, edit, delete, type and look up lyrics (consent first, kept only on Save).
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
