# Choir LMS

Choir LMS is an Nx-based monorepo for building a suite of tools that help choirs organize learning materials and make rehearsal preparation more effective.

The long-term goal is a broader choir learning platform that can bring together storage integrations, rehearsal materials, collaboration workflows, and role-specific tools for singers, section leaders, and directors. The first product slice is narrower by design: a mobile rehearsal player that turns shared audio into repeatable personal practice sessions.

## Vision

Choirs often already have the raw material they need for self-rehearsal, but it is scattered across shared drives, folders, and messages. This project aims to add a rehearsal-focused layer on top of those existing assets so choir members can spend less time searching and more time practicing.

At a high level, the platform is intended to support:

- integration with existing storage systems, starting with Google Drive
- audio, document, schedule, and rehearsal material access from a unified product surface
- practice-specific workflows such as saved loops, playlists, annotations, and guided rehearsal content
- future expansion into broader choir operations and learning workflows

## First Product Slice

The current focus is a mobile-first rehearsal player built with React and intended for native-feeling mobile playback.

For the MVP, the player is expected to support:

- browsing and playing audio files from Google Drive
- marking start and end points on a track and saving them as named loops
- adding full tracks and saved loops into playlists
- ordered playback, repeat, and shuffle for rehearsal sessions
- lyrics saved with a track and read during playback (see [Lyrics](#lyrics))
- optional sheet music links per track, opened in a full-screen viewer (see [Sheet music](#sheet-music))
- named markers at points of a track, shown as flags on the waveform, that jump playback and turn into loops (see [Markers](#markers))
- a piano for checking pitches against the track and the score (see [Piano](#piano))
- native mobile transport integration where practical, including background playback and lock-screen controls

The MVP explicitly does not include offline playback, document collaboration, score annotation, recording overlays, or broader rehearsal management workflows.

## Lyrics

A saved track can hold one body of plain-text lyrics, stored with the track in the on-device library like its tags. Loops and adjusted tracks do not keep their own copy: they show the lyrics of the track they came from, and removing a track removes its lyrics.

- **Adding lyrics:** open `Lyrics` (or `Edit lyrics`) from any track, loop, or playback menu. Type or paste text, use `Search <source>` (Google by default) to open a search for the title and artist in the system browser, with a dropdown for the other sources in `Settings`, or use `Look up` to fetch suggestions.
- **Where lookup comes from:** `Look up` asks the open [LRCLIB](https://lrclib.net) service. It runs only when you tap it, after a one-time notice on the device, and sends the title, artist, and track length you see in the editor, nothing else. Results are suggestions: you review and can edit them, and nothing is saved until you press `Save`. Timed (synced) lyrics are ignored.
- **Privacy and copyright:** saved lyrics stay on the device; the app never uploads or shares them. Looked-up text is third-party content that you choose to keep in your own library, and the lyrics service's own terms apply to the lookup.
- **Reading:** the playback screen has a Lyrics section, the mini-player shows a `Lyrics` control while the playing item has lyrics (a half-height peek), and `View` / `Expand` opens a full-screen reading mode. One text-size setting (`Small` to `Extra large`) applies to all three.

## Sheet music

A saved track can carry up to 10 sheet music sources, such as the full score and one part. The app stores only a link (a Google Drive file or a web address), a label, and the chosen parts; it never copies, hosts, or uploads a score. Loops and adjusted tracks show the sources of the track they came from, and removing a track removes its links.

- **Reaching it:** `Sheet music` in any track, loop, or playback menu (after `Lyrics`) opens a manager sheet. There is no sheet music section on the playback screen. `View` opens a full-screen viewer with a play/pause control, and the screen stays awake.
- **Adding:** `From Google Drive` (a picker that shows only PDF, MusicXML, MIDI, and MuseScore files), `From a web link` (pasted, detected, validated), or `Search <source>` (MuseScore by default; opens a prepared search in the system browser, with a dropdown for IMSLP, a web PDF search, and any source you add). The sources are two ordered lists in `Settings`, `Score search` and `Lyrics search`: reorder them (the first is the default), remove all but one, add a built-in back, or add your own `https` address with `{query}`, `{title}`, or `{artist}` where the search goes. The app only opens these addresses in the system browser; it never fetches from them.
- **Formats:** PDF is drawn as pages on the web build, in one of three layouts chosen with the viewer's `Layout` button: `Scroll` (a column of pages fitted to the width, the default), `Pages` (one whole page at a time, turned by swiping, the arrow keys, `Page Up`/`Page Down`, the wheel, or `Previous page` and `Next page`, snapping to each page), or `Strip` (every page side by side in one row that scrolls sideways, each as tall as the viewer). `Page 3 of 81` shows in every layout, and changing layout, zooming, or turning the phone keeps the page you are on. The layout you choose is remembered for the device; turn on `Only for this file` in the sheet to give one file its own layout (saved on that source, and `Use the device layout` removes it). Zoom runs from 50% to 400% in every layout (100% fits the width in `Scroll`, the whole page in `Pages`, and the height in `Strip`) by the buttons, a pinch, `Ctrl`/`Cmd` + wheel, or a double tap, and keeps the point under your fingers in place; a zoomed `Pages` page pans freely and snaps again at 100%. Native iOS and Android do not draw PDFs yet. MusicXML (`.musicxml`, `.xml`, `.mxl`) is drawn as staves in one strip that scrolls sideways, shrunk to fit the height you have (never below 50%) until you zoom by hand; `Fit to height` brings that back. MIDI is converted to MusicXML on the device and drawn the same way; part names are read from the file (including exporters that name a track in the empty track before it), a pickup is found from where the long notes land, time and key signature changes are followed bar by bar, a drum or beatbox track is drawn on a percussion staff and counts as a vocal part, runs of 32nd notes are recognized, and a short gap between notes is kept as a rest rather than closed, but the notation is approximate, performed (not score-exported) MIDI will look rough. Every MIDI file is drawn as it is, whatever it holds (a Performous game file shows as stacked chords); the app does not judge whether a file is useful. MuseScore files (`.mscz`, `.mscx`) and `musescore.com` pages are not rendered: they open outside the app, so export MusicXML from MuseScore to view a score here. The app never fetches from musescore.com. **Finding your place:** `Go to` in the viewer's controls opens a drawer over the left of the score with a bar-number field (the number printed on the score), the file's rehearsal marks as a tap-to-jump list, and the part names in staff order; it takes no room while you read. Tapping a staff shows its part's name for a moment. A long score (over 96 bars) is drawn in runs of bars as you scroll, so any length works and a short arrangement is drawn in one piece.
- **Parts:** for MusicXML and MIDI the viewer shows the vocal parts by default (a part is hidden only when it is known to be instrumental). `Vocal parts`, `All parts`, and per-part chips change the choice, and it is remembered per source. A PDF has no parts.
- **Your parts:** Settings has an ordered `Your parts` list (Soprano, Mezzo-soprano, Alto, Tenor, Baritone, Bass, Beatbox, or any name you type, such as `Lead` or `Alto 2`), reordered by dragging or with the arrows. A source with no saved choice of its own opens on the first listed part the score has: every name is tried for an exact match first (digits count, so `Alto 2` finds only `Alto 2`), then for a close match (`Alto` also finds `Alto 1` and `Alto 2`; instrumental parts are never suggested), and only that part's staves show. With nothing listed, or nothing matching, it follows the exact part you last showed alone with the chips, then falls back to the vocal parts. `Make <Part> my part` in the viewer puts the exact part showing at the top of the list, and pressing it again removes it. A part saved on a source always wins. The list is stored on the device, not per track.
- **What is fetched, and when:** a file is downloaded only when you open it, with your existing Google authorization for Drive files, or directly from the address for a web link. On the web build, a host that does not allow browser requests shows `Open in browser`; saving the file to Drive always works. The renderers (OpenSheetMusicDisplay, pdf.js, a MIDI parser) are separate chunks loaded when a viewer opens, not at startup. Nothing is uploaded.
- **Not yet:** the iOS and Android renderers are tracked in `native-playback-follow-ups`; until then a native build lists the sources and opens them outside the app.

## Markers

A saved track can hold up to 200 named markers, such as `Verse 2` or `Bridge`, each at a point in the audio. They are stored with the track like its tags and lyrics. Loops and adjusted tracks show and edit the markers of the track they came from (positions are in the original audio's time, so speed and pitch shaping never move them), and removing a track removes its markers. Markers are not library entries: they do not appear in Files, search, tags, or playlists.

- **Reaching them:** `Markers` in any track, loop, or playback menu (after `Sheet music`) opens a list for the owning track; opened from a loop it shows only the markers inside that loop. The playback menu also has `Add marker here`.
- **Adding:** `Add marker here` takes the playhead, or long-press the playback waveform to add at the pressed point. A new marker is named `Marker N`; a confirmation offers `Rename`. Each row's menu has `Rename`, `Move` (nudges, `Set to current position`, or a typed `mm:ss.s`), and `Delete` with undo.
- **Loop boundaries:** every saved loop shows `<name> start` and `<name> end` rows, computed from the loop, so they follow edits and disappear with the loop. They are read-only; `Keep as marker` copies one into your own markers. `My markers` hides them (the choice is remembered on the device and also filters the waveform flags).
- **Jumping:** tap a row, or a flag on the waveform, to seek there while playing or paused; from the library it loads the track and starts at the marker. A marker past the end of a replaced, shorter audio file is greyed and not jumpable but is kept.
- **Flags:** the playback waveform draws your markers as accent hairlines with a small head and loop boundaries as shorter dim ticks; press one to see its name, long-press it for its row actions.
- **Markers to loops:** `Loop to next marker` on a row, `Select` two markers then `Make loop`, or `Create loops from markers` (one loop per section between your markers, named after the start marker, with an optional `Intro`). All open or use the normal loop editor and save operation.
- **In the loop editor:** your markers (never loop starts or ends) are drawn on the editor waveform (`Hide markers` / `Show markers` toggles them); tap the flag button on the Start or End card to choose that edge from the list, or tap the card and then a flag. Markers the armed edge cannot take (a start at or after the end, or an end at or before the start) are dimmer and listed separately; choosing one asks whether to move the other edge to the track start or end, pick another marker, or cancel. Markers are read-only there.

## Piano

A singer checking a pitch can open an 88-key piano (A0 to C8) over the app without leaving the track or the score. It is a web-only capability for now: native has no piano sound, so its controls are absent there (tracked in `native-playback-follow-ups`).

- **Opening it:** the `Piano` item in the tab bar (it needs no track, so it works before anything has played and after playback ends), in the header of the playback screen (beside the more actions button), and in the sheet music viewer's controls. It docks above the mini-player and tab bar (under the score in the viewer, where the score area shrinks to fit), never pauses, ducks, or moves the track, and remembers whether it is open, its height, and where it was scrolled. Drag its handle to one of three heights (a short landscape window caps it at the smallest); `Close piano` closes it everywhere.
- **Playing:** keys sound while held, with several fingers at once, and sliding across keys plays a glissando. A touch that begins on a key plays and never scrolls; the strip beneath the keys, a labelled map of the octaves (C1 to C8), scrolls the keyboard. Notes are concert pitch (A4 = 440 Hz) and do not follow the track's pitch shaping. It opens on middle C, or on the range of the part shown in the sheet music viewer. C keys carry their octave (`C4`).
- **Computer keyboard:** with the piano open on a desktop browser, the `A S D F G H J K L ;` row plays the white keys from middle C and the `W E T Y U O P` row the black keys; `Z` and `X` move an octave down or up. Shortcuts and typing in text fields are left alone.
- **Tapping the score:** tapping a notehead in MusicXML or MIDI sheet music sounds its pitch (at least 350 ms) and lights the key; a part's transposition is applied, rests and tied continuations do nothing, and a PDF is not tappable.
- **Settings:** a `Piano` section chooses the sound (`Piano` is a synthesized tone for now; recorded samples are planned, `Organ` is a simple oscillator), whether every key is named, and how black keys are spelled (sharps or flats). The piano's volume is in its handle row and is separate from the track's.

## Product Direction

This repository is intentionally scaffolded as an Nx workspace rather than a single app so the system can grow into a library of apps and shared packages over time.

The expected shape is:

- one or more user-facing applications under `packages/`
- shared domain and integration packages for media, storage, auth, and choir-specific workflows
- OpenSpec-driven change proposals to keep product scope and implementation aligned as the platform expands

The first change proposal for this direction is `add-mobile-rehearsal-player` under `openspec/changes/`.

## Repository Notes

- `packages/` is the workspace home for future apps and shared libraries
- `openspec/` contains proposals, designs, specs, and tasks for planned work
- `nx.json` and the root TypeScript configuration provide workspace-level build and project settings
- Cross-platform playback architecture details are documented in `docs/mobile-cross-platform-audio-playback.md`

## Development

This workspace uses npm workspaces with the committed root `package-lock.json`.
Prefer `npm exec -- <tool>` for local CLIs, especially `npm exec -- nx ...` for
workspace tasks.

Useful Nx commands:

```sh
npm exec -- nx show projects
npm exec -- nx graph
npm exec -- nx sync
```

### Testing

The currently implemented automated tests run through Nx `test` targets and execute with Node's built-in test runner using `tsx --test`.

- Test sources use `node:test` plus `node:assert/strict`. Mobile component specs render with `@testing-library/react-native/pure` through a small `src/test-support/` preload that maps `react-native` to `react-native-web`.
- Primary command pattern: `npm exec -- nx run <project>:test`.
- In this workspace, Jest and Vitest are not the active test harness for existing package tests.
- For targeted mobile test runs, use:
  - `npm exec -- nx run mobile-rehearsal-player:test-file -- --file=src/path/to/file.spec.ts`
  - `npm exec -- nx run mobile-rehearsal-player:test-pattern -- --pattern='src/**/*.spec.ts'`

### Google OAuth for mobile manual testing

The mobile rehearsal player reads Google Drive OAuth IDs from `packages/mobile-rehearsal-player/.env`.

For the default app identifiers in this repo:

- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` should be an iOS OAuth client for bundle ID `com.choirlms.mobile`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` should be an Android OAuth client for package `com.choirlms.mobile`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is only needed when running the app on web

The app asks Google for two Drive scopes: `https://www.googleapis.com/auth/drive.readonly` (browsing and playing files) and `https://www.googleapis.com/auth/drive.file` (saving a sheet music file to the user's Drive, the `Save to Drive` flow). The OAuth consent screen in the Google Cloud project must list both, and every account that signs in while the app is in Testing must be a test user. The console steps are in [design.md](openspec/changes/save-blocked-sheet-music-links-to-drive/design.md#google-cloud-console-setup-project-owner); no new client ID or `.env` value is needed.

To get the Android debug SHA-1 for local `expo run:android` builds:

```sh
keytool -list -v -alias androiddebugkey -keystore ~/.android/debug.keystore -storepass android -keypass android | grep SHA1
```

If `~/.android/debug.keystore` does not exist yet, generate the standard Android debug keystore first:

```sh
keytool -genkeypair -v -keystore ~/.android/debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
```

After filling the client ID for the platform you are testing, verify the Expo config and launch a dev build:

```sh
cd packages/mobile-rehearsal-player
npm exec -- expo config --type public
```

```sh
npm exec -- nx run mobile-rehearsal-player:run-ios
# or
npm exec -- nx run mobile-rehearsal-player:run-android
```

For deterministic local and CI validation, `npm exec -- nx run mobile-rehearsal-player:build` performs a local Expo export. Use `npm exec -- nx run mobile-rehearsal-player:eas-build` when you intentionally want to trigger an EAS build.

### GitHub Pages deployment

The repository includes [.github/workflows/deploy-mobile-web-pages.yml](.github/workflows/deploy-mobile-web-pages.yml) to export and deploy the mobile web app to GitHub Pages automatically after the `CI` workflow succeeds for `main`, and it can also be run manually with a `ref` input through `workflow_dispatch`.

Before the workflow can publish, enable GitHub Pages for the repository and set the build source to GitHub Actions in the repository settings.

The workflow reads the configured Pages base path from GitHub and passes it to Expo as `EXPO_BASE_URL`, so project sites such as `https://vehpus.github.io/choir-lms/` and custom domains export the correct asset URLs.

For Google Drive sign-in to work in the deployed web build, add repository variables for `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`. The workflow also reads optional repository variables for `EXPO_PUBLIC_APP_SCHEME`, `EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER`, `EXPO_PUBLIC_ANDROID_PACKAGE`, `EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_MIME_TYPES`, and `EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_EXTENSIONS`.

Do not add `GOOGLE_WEB_CLIENT_SECRET` to the repository or workflow for this frontend-only deployment.

To preview the same path handling locally for the current repository URL shape:

```sh
EXPO_BASE_URL=/choir-lms npm exec -- nx run mobile-rehearsal-player:build
```

OpenSpec workflow:

```sh
openspec list --json
openspec status --change "add-mobile-rehearsal-player"
```

### Agentic OpenSpec workflow:

- repo-level policy lives in `AGENTS.md`
- OpenSpec change artifacts auto-load additional guidance from `.github/instructions/openspec-deliberate-execution.instructions.md`
- `openspec-checkpointed-implementation` runs the one-subtask execution loop
- `implementation-checkpoint` handles the validated pause for feedback, manual verification, and commit decisions

### Workspace agent skills

The repo carries workspace-local GitHub Copilot skills under `.github/skills/`
with mirrored agent copies under `.agents/skills/` for repeated mobile design
and implementation work:

- `mobile-folder-structure` for Expo-inspired naming and folder-organization work in `packages/mobile-rehearsal-player`, especially when reducing flat directories or grouping files by feature ownership
- `expo-liquid-glass` for guarded glass or translucent UI work in the mobile shell, mini-player, playback sheet, and modal surfaces
- `design-audit` for phased UI and UX audits of the mobile rehearsal player before broader visual refactors
- `apple-hig-ios` and `music-ui-iconography` for iOS pattern decisions and playback icon semantics

## Status

The repository is still in early setup. The product direction and first implementation slice are defined in OpenSpec, and the next step is implementation of the mobile rehearsal player foundations.
