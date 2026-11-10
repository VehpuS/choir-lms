## Context

Today's harness (`tools/browser-session/`) serves the `build-browser-test` export, seeds `localStorage` with a mock library, optionally fakes a Google Drive account (`signed-out` / `expired` / `authorized`), and runs steps through `runScenario`. Playback "needs real audio and is out of scope" per the README, and nothing stops a scenario from silently reaching a real host. The review below proposes what to cover and what to add to the tooling so coverage can grow without touching Drive, sound or the network.

## Decisions

- **Same stack, no new runner.** Keep Playwright + `tsx` scenarios and `runScenario`; do not introduce `@playwright/test` (matches the testing policy: no new runner without a migration request). A scenario is a file `tools/browser-session/<area>-<behavior>.scenario.ts`.
- **Offline by construction.** `openMockLibrarySession` installs a catch-all `context.route('**/*')` that aborts and records any request whose origin is not the local server, then `runScenario` fails the scenario if the record is non-empty. Declared mocks (`drive`, `webFiles`) are routed first, so the guard only sees what a scenario forgot to mock.
- **Deterministic audio.** `buildToneWav({ seconds, hz })` makes a small PCM WAV in memory; the mock Drive serves it for `files/<id>?alt=media` (with `Range` support so seeking works) and `webFiles` serves it for link tracks. Assertions read position/state from the app's own UI and from `HTMLMediaElement` via `page.evaluate`, with the element's volume at 0 (see the debugging skill: never `muted`). A seekable fixed-length file lets loops, markers and the progress bar be checked without timing sleeps.
- **Fake microphone.** Chromium launched with `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream` (optionally `--use-file-for-fake-audio-capture=<wav>`), so recording and pitch flows get a real `MediaStream` with a known signal.
- **Fixtures as builders.** Extend `mock-library-fixtures.ts` with small builders (`buildMockLoop`, `buildMockPlaylistWithItems`, `buildMockTag`, `buildMockMarkers`, `buildMockLyrics`, `buildMockComposite`, `buildMockRecording`) so each scenario names only the fields it cares about. Fixture storage keys stay covered by the existing spec that keeps them in step with `@org/audio-library-runtime`; each new builder gets a round-trip spec through the real parser.
- **Locators.** Prefer `getByLabel` / role; add an `accessibilityLabel` to the app only when no stable accessible name exists. Never select by style or test-ids invented just for tests.
- **Failure evidence.** `runScenario` records a Playwright trace per scenario (written to the output dir only on failure) next to `failure.png`, plus the console errors collected during the run; `expectNoConsoleErrors()` is opt-in per step because the app has known baseline warnings (listed in the debugging skill).
- **Speed.** One build, scenarios run sequentially in one process each; a `--scenario=<substring>` filter on `browser-test` so an agent can run one scenario while iterating. Scenarios share the built export and never rebuild.
- **Agent workflow.** A new `browser-test-coverage` skill is the entry point: bug report → reproduce as a failing scenario first → fix → keep the scenario; new user-visible behavior → add or extend a scenario in the same change (new line in the testing policy and `AGENTS.md`).

## Proposed coverage (review of the app)

Existing: add-to-playlist snackbar, Drive access banner and chips, track rename, sheet music PDF.

| Area | Scenarios (each offline) |
| --- | --- |
| Shell and navigation | Tabs (Library, Add, Recents) switch and keep state; deep view restore on reload; narrow and wide viewport layout |
| Library: Tracks and Files | Empty library state; search/filter tracks; Files folder navigation, create folder, move, delete with confirm; bulk selection bar and remembered bulk choices |
| Playlists | Create, rename, reorder, remove item, delete; open from Recents |
| Loops | Create a loop from a track at a position, edit range, appears under the track, plays from loop start |
| Playback | Play a tone track (state, progress, seek), mini-player to full sheet, speed/pitch controls change the readout, queue add/reorder/remove, ordered vs shuffle |
| Markers and lyrics | Add/rename/delete a marker and jump to it; lyrics open and edit |
| Tags and search | Tag a track, filter by tag; Add tab local search; Drive search with the mock account |
| Drive flows | Authorized add-from-Drive review and import basket; expired session reconnect; offline files download and clear |
| Backup, restore, share | Backup produces a bundle file (download captured); restore/import preview of a bundle fixture, additive import result; share-folder and access guide wording against mock Drive responses |
| Recordings | Record with the fake microphone, stop, save sheet, appears in Recordings, play back, delete; storage-limit message |
| Composite tracks | Create from stems, mute/solo, mix preset, export button state; relink missing stem |
| Settings | Bulk selections and Renaming preferences show, change, clear; persists across reload |
| Sheet music | Existing PDF scenario plus MusicXML/MIDI-derived score opens |

## Open questions (fixtures wanted)

- Is a short real choir stem acceptable as a committed fixture (≤200 KB), or should everything stay generated tones?
- A sample library bundle (`.zip`) exported from the real app, for the restore/import scenarios; or generate from `audio-library-runtime`'s builder in the scenario (the proposed default).
- A sample MusicXML and a MIDI file for the score scenarios.
- Whether recording scenarios should assert a pitch result from the fake microphone, or only the take lifecycle.

## Risks

- Flaky timing around playback: mitigated by fixed-length fixtures and waiting on UI state, never fixed sleeps.
- Suite runtime in CI: scenarios are independent, so the target can later shard by file glob if it passes a few minutes.
- Fake-device Chromium flags are Chromium-only; the suite stays Chromium-only.
