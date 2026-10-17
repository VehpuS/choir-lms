## Context

The library stores each saved track as a `DriveAudioSource` (persisted through the AsyncStorage practice repository), each loop as a `NamedLoop` that points at its track by `sourceId`, and an adjusted track as a `DriveAudioSource` with an `adjustment.sourceRef` back to the saved track it was shaped from. Tags already live on these records as optional fields, parsed and normalized at the storage boundary, so an optional field with no key migration is an established pattern. Tracks carry only a file `name` (no artist or title metadata), a `durationMs`, and a Drive link.

The playback screen (`routing/playback/now-playing/`) already hosts the waveform, transport, and a queue section; the mini-player is a waveform-first summary; every item menu is built from the shared saved-item menu and the single label-to-icon map in `options-menu-sheet/menu-action-icons.ts`. The app has no network layer beyond Google Drive, and `expo-web-browser` and `Linking` are already available.

Users rehearse from lyrics as well as audio, and the lyrics are the one thing they currently leave the app to read. The user decided on three lookup paths (an open lyrics service, a web search, typing or pasting), storage with the saved track, and a playback panel plus a mini-player peek and a full-screen reading mode. Word tracking and auto-scrolling are explicitly out of scope.

## Goals / Non-Goals

**Goals:**

- One plain-text lyrics body per saved track, editable and deletable, that survives restarts and follows the track.
- Lookup that is always a suggestion: nothing is saved until the user presses Save, and the user can edit the text first.
- Lyrics reachable in two taps from anywhere playback is running, readable at a chosen size, including in a dim room.
- Loops and adjusted tracks show their parent track's lyrics without storing a copy.

**Non-Goals:**

- Word or line tracking, auto-scrolling, timed or synced lyrics (the service's synced field is ignored).
- Sharing, exporting, or syncing lyrics between users or devices beyond how the library itself persists.
- Lyrics for playlists, folders, or per-loop annotations.
- A bundled lyrics catalog or any server we operate.

## Decisions

### Decision 1: Lyrics are one optional field on the saved track

Add `lyrics?: { text: string; updatedAt: string; origin: 'looked-up' | 'typed' }` to `DriveAudioSource`. `origin` records how the text first arrived (it flips to `typed` once the user edits looked-up text) so the editor can keep a short "Looked up, edited by you" attribution line and so a later change can offer a refresh. Parsing and normalization happen where the record is read from storage: text is trimmed of trailing whitespace, line endings are normalized to `\n`, runs of more than two blank lines collapse to one blank line, and a body over 20,000 characters is rejected at the editor boundary (and truncated defensively when read). An empty body deletes the field rather than storing an empty string. Old records have no field and need no migration.

Alternatives considered: a separate `lyrics` collection keyed by track id (more storage plumbing, an extra delete path to keep in sync with track removal, no benefit at this size); a Drive sidecar `.txt` (needs Drive write scope and conflict handling, and does not work for tracks whose Drive access has lapsed, which the app deliberately keeps visible).

### Decision 2: Loops and adjusted tracks resolve through the owning track

A single resolver in `audio-library-models`, `resolveLyricsOwner(item, sources)`, maps a track, an adjusted track (via `adjustment.sourceRef`), or a loop (via `sourceId`, then the same adjusted-track hop) to the saved track that owns the lyrics, and returns `null` when the owner no longer exists. Every reader (playback section, mini-player peek, menu state) uses it; no copy of the text is stored on loops or adjusted tracks. Editing lyrics while an adjusted track or loop is playing edits the owner and says so in the editor subtitle (`Lyrics for <track name>`).

Consequences: removing a track removes its lyrics with it, which the existing dependency-aware removal flow already covers; `Create a copy` of a Files link points at the same source, so it shows the same lyrics; copying a track record into a new independent source does not exist today, so there is no divergence to define.

Alternative considered: copy lyrics onto each loop and adjusted track at creation. Rejected: it duplicates up to 20,000 characters per derived item and makes an edit on one copy silently disagree with its siblings.

### Decision 3: Lookup is a small client for an open lyrics service, behind an interface

Add `LyricsLookupClient` (`search({ title, artist, durationMs }) => Promise<LyricsCandidate[]>`) in `packages/mobile-rehearsal-player/src/app/library/lyrics/`, with one implementation against LRCLIB (`/api/search` and `/api/get`, no key). Candidates carry `title`, `artist`, `durationMs`, and `plainLyrics`; the synced field is dropped at the boundary and any `[mm:ss.xx]` stamps that appear in plain text are stripped. The editor pre-fills `Title` from the track name with its file extension and common noise (leading track numbers, `_`) removed, leaves `Artist` empty for the user, and sends the track's duration so the service can rank exact-length matches. A candidate is shown with its title, artist, and length difference; tapping it loads its text into the editor, never straight into storage.

The client takes an injected `fetch` and an `AbortSignal`, has a 10 s timeout, and returns a typed failure (`offline`, `rate-limited`, `unavailable`, `no-results`) that the editor maps to a message and a retry; it never throws into the UI. Lookup runs only on a user tap on `Look up`, never on open, so nothing is sent without intent. Before the first lookup the editor shows one line saying that the title, artist, and track length are sent to the lyrics service; acknowledging it is remembered per device.

Alternatives considered: a paid or keyed lyrics API (licensing is cleaner but needs a key shipped in the app or a proxy we would have to run); scraping search pages (fragile and a terms-of-service problem). The service interface keeps the choice replaceable.

### Decision 4: `Search the web` opens the system browser

The editor's `Search the web` action opens `https://www.google.com/search?q=<title> <artist> lyrics` through the existing `openUrl` seam (`Linking.openURL`), so it is testable with a fake and needs no new dependency. The user copies text from the browser and pastes it into the editor. The query is built by one pure function shared with the lookup pre-fill, URL-encoded, and contains only what is visible in the editor's Title and Artist fields.

### Decision 5: One editor sheet, three ways in

The editor is a bottom sheet (`LyricsEditorSheet`) opened from the saved-item menu `Lyrics` action, from `Add lyrics` on an empty playback Lyrics section, and from `Edit` on a filled one. It holds the Title and Artist lookup fields, `Look up` and `Search the web`, a multiline text field with a character count, and `Save` and `Cancel`. Closing with unsaved edits asks for confirmation (`Discard changes?`) using the app's existing confirmation dialog. `Delete lyrics` sits in a destructive group and confirms. The saved-item menu entry reads `Lyrics` on a track with none and `Edit lyrics` once present, and uses the shared icon map (a new `Lyrics` glyph from Phosphor, e.g. `TextAlignLeft`, with the spec that fails on an unmapped label updated alongside).

### Decision 6: Viewing — section, peek, reading mode, one size control

- The playback screen gets a `Lyrics` section below the transport, collapsed to a few lines with `View`, resolving the owner through Decision 2; an empty state offers `Add lyrics`.
- The mini-player gets a `Lyrics` control that opens a half-height peek sheet over the current screen, with `Expand` to reading mode and `Edit`. It is shown only while the playing item has lyrics, so the mini-player does not gain a dead control.
- Reading mode is a full-screen view with a large, left-aligned, high-contrast text column on the Nocturne ground, generous line height, a text-size control (four steps: `Small`, `Medium`, `Large`, `Extra large`), and a close button. The text size is a device preference stored with the other app preferences and shared by all three surfaces. Text is selectable on web and native. No scroll position is tracked or driven; the user scrolls by hand, and playback controls stay reachable (the mini-player remains visible over reading mode's bottom edge).
- Keeping the screen awake in reading mode is useful for a singer holding a phone but needs `expo-keep-awake`. It is recorded as an open question below rather than assumed.

### Decision 7: Tests at the narrowest level

Pure logic is tested with `node:test`: lyrics normalization and the 20,000-character limit, `resolveLyricsOwner` (track, adjusted track, loop, loop of an adjusted track, missing owner), candidate parsing from fixture responses including synced-stamp stripping, the title and artist pre-fill and query builder, and the lookup client against an injected fake `fetch` (success, empty, rate-limit, offline, abort). Repository persistence round-trips through the AsyncStorage fake already used by the storage specs. Component slices follow the repo's render-test pattern for the menu action, the playback section states (empty, filled, owner missing), the editor's discard and delete confirmations, and the text-size control. Web verification uses the browser preview with the test library; a real LRCLIB call is checked once manually.

## Sheet music (added 2026-10-14)

The decisions below extend the lyrics design. Several rest on facts that are not yet verified in this codebase (rendering libraries in the Expo web build, CORS on arbitrary hosts, the quality of MIDI notation); those are spikes in task group 9, to be settled and written back here before the build tasks start.

### Decision 8: Sheet music is a list of links on the saved track, never file content

Add `sheetMusic?: SheetMusicSource[]` to `DriveAudioSource`, next to `lyrics`, parsed and normalized at the storage boundary, absent on every existing record (no migration), and capped (10 sources per track, 60-character labels). A source is `{ id, label, location, format, partSelection?, addedAt }` where `location` is `{ kind: 'drive'; fileId; name }` or `{ kind: 'url'; url }`, `format` is `'pdf' | 'musicxml' | 'midi' | 'musescore' | 'link'`, and `partSelection` is `'vocal' | 'all' | { include: string[] }` (Decision 12). The app stores the link and settings only: no file is copied into the library, so there is nothing to sync, no copyright redistribution, and a lapsed Drive file simply shows as unavailable. Owner resolution reuses `resolveLyricsOwner` (Decision 2), so loops and adjusted tracks read the parent track's list, a created adjusted track never copies it, and removing the track removes its links.

Why multiple: a choir often holds the full score and a separate part file for the same piece, so one track can carry several sources, each with its own label (for example `Full score`, `Alto part`) and its own part selection. They stay a plain ordered list; the user can reorder by removing and re-adding, and a drag-to-reorder is a follow-up.

Alternatives considered: copying the file into app storage (works offline but duplicates large files, adds a redistribution question, and needs eviction; offline caching is already its own change, `offline-audio-caching`, and can cover sheet music later); one `sheetMusicUrl` string (cannot hold a score plus parts or per-source settings).

### Decision 9: Format detection, and what each format becomes on screen

`detectSheetMusicFormat({ name, mimeType, url })` is a pure function used at the boundary where a source is added. It decides from the Drive file's MIME type and name, or from the URL path's extension, with these outcomes:

| Detected                                                                    | Shown as                                                                                                                                              |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.pdf` / `application/pdf`                                                  | Rendered pages (PDF viewer). No part filtering: a PDF is pictures of staves.                                                                          |
| `.musicxml`, `.xml` containing `score-partwise` or `score-timewise`, `.mxl` | Rendered as staves with part filtering (OpenSheetMusicDisplay, built on VexFlow).                                                                     |
| `.mid`, `.midi`                                                             | Notated as staves, with part filtering, through a conversion step (Decision 11). Not labelled (decided 2026-10-15).                                   |
| `.mscz`, `.mscx` (MuseScore files)                                          | Not rendered in the app (Decision 10). Stored as a link and opened outside the app.                                                                   |
| a `musescore.com/...` page URL                                              | A link-out source (Decision 10).                                                                                                                      |
| anything else                                                               | Refused at add time with a message that names the supported formats; a URL with no clear extension may be added as `link` and opened outside the app. |

A bare `.xml` cannot be confirmed from its name, so it is accepted as MusicXML at add time and the loader checks its root element after download; a file that is not MusicXML is rejected as `unsupported` (decided by the user, 2026-10-14).

Keeping detection pure and at the boundary means the viewer only ever receives a known format.

### Decision 10: MuseScore is search and link-out, not a rendered format

MuseScore.com has no current public API that we can rely on (the old developer API was retired, and score downloads depend on each score's license and on the user's account), and a MuseScore score page cannot be embedded or downloaded by the app without the user's login and MuseScore's terms. Native `.mscz` files have no browser renderer. So:

- `Search MuseScore` builds a MuseScore search URL from the Title and Artist fields (a pure function, specced like the lyrics web search, to be confirmed in task 13.2) and opens it in the system browser. The user finds a score there, then brings it back as one of: a `musescore.com` page link (stored as a link-out source and opened in the browser), or a file they exported themselves (MusicXML, PDF, or MIDI) saved to Drive or hosted at a URL, which the app renders.
- `.mscz` / `.mscx` files are accepted as links but opened outside the app, with a one-line hint to export MusicXML from MuseScore for in-app display. Converting them in the app would need a MuseScore engine or a server we do not run; that stays a recorded follow-up, not a promise.
- The add flow never scrapes or downloads from musescore.com, and says so where it explains the options.

This is the main place where the request, rendering MuseScore, is narrowed; the user confirms it in task 9.4.

### Decision 11: Rendering engines, loaded on demand

- **PDF:** a pdf.js renderer showing pages in a scrolling column with zoom. Spike 9.2 found that `pdfjs-dist` 6.x cannot load under Metro (`import.meta`), so the plan pins `pdfjs-dist@3.11.174`, starts with the main-thread fake worker (no static file) and moves to a real worker served from `public/` if long PDFs janks. Native: a WebView host or `react-native-pdf`, recorded in `native-playback-follow-ups` 1.6.
- **MusicXML and MXL:** OpenSheetMusicDisplay (OSMD, 2.2.1; about 395 KB lazy chunk, renders 40 bars of 5 parts in about 130 ms in the dev build) renders MusicXML (and compressed `.mxl`) to SVG using VexFlow and supports hiding parts. Parts are filtered by choosing which parts to include before render, so a hidden part is not laid out at all. The staves are drawn as one long system that scrolls sideways (OSMD's single horizontal staffline), as a singer reads, not as lines wrapped to the screen width: measured on a phone-width pane for 80 bars of four parts, the wrapped page was about 15,000 px tall at roughly a bar per line, while the strip was 12,800 px wide and 415 px tall and rendered in 92 ms. OSMD stops at 32,768 px (about 200 bars of four parts at 100% zoom, fewer when zoomed in) and wraps into a second line past that. PDFs stay a vertical column of pages. **Fit to height (decided 2026-10-17):** a strip is as tall as its parts (about 416 px for four parts at 100%), more than a phone held sideways leaves (about 284 px), so the viewer starts in an auto-fit mode with zoom = `min(1, availableHeight / naturalHeight)`, never below a 0.5 floor. Below the floor the score scrolls vertically rather than shrinking the notes further. Auto-fit re-runs when the available height changes (rotation, parts shown or hidden). The first manual zoom change turns it off, so it never fights the singer, and a `Fit` control turns it back on. A PDF fits to width instead, so `Fit` is not shown for it.
- **MIDI:** MIDI is performance data, not notation: it has notes and timing but no key spelling, voices, lyrics layout, or reliable measure structure. The conversion step parses the file (`@tonejs/midi` or similar), takes tracks as parts, quantizes note onsets and durations to a grid, infers key and time signature from meta events, and emits MusicXML that OSMD renders, so MIDI and MusicXML share one renderer and one part filter. Spike 9.3 measured a prototype on public-domain chorales: pitch and onsets were 100% right and durations 97 to 99% for per-voice tracks (71 to 76% for one merged polyphonic track), with bar lines wrong after a pickup measure and recorded, rubato MIDI untested. The result is approximate (spelling and rests can be rough, and only eighth-note triplets are detected). The user decided on 2026-10-14 to ship it, and on 2026-10-15 that the viewer does not label it: a generic "approximate" note tells a singer nothing they can act on.
- All three libraries are imported dynamically from the viewer, so they add nothing to startup or to the bundle a user who never opens sheet music downloads. Platform divergence (web renders in the DOM; native needs a WebView host or a native PDF view) follows the app's `.web` / `.native` file convention behind one renderer interface, `SheetMusicRenderer`, so the viewer, the part filter, and the model are shared.
- **Scope split (confirmed by the user, 2026-10-14):** this change builds the shared model, the web renderers, and the viewer; the iOS and Android renderers, their implementation, and their on-device checks are bundled into `native-playback-follow-ups` (task 1.6) and are not implemented or verified as part of this change.

### Decision 12: Part filtering, with vocal parts as the default

A pure `extractScoreParts(parsedScore)` returns the parts of a MusicXML or MIDI source as `{ id, name, instrument?, midiProgram?, kind: 'vocal' | 'instrumental' | 'unknown' }`, where `kind` comes from `classifyVocalPart`:

- MusicXML: `score-part` names and instrument names matching soprano, alto, tenor, bass, baritone, mezzo, treble/vocal/voice/choir/chorus/SATB and common abbreviations (`S`, `A`, `T`, `B`, `Sop.`), and `midi-program` values for choir and voice sounds (GM 53 to 55). A piano reduction of the voices stays `instrumental`.
- MIDI: track names and the same program numbers; unnamed tracks are `unknown`.
- A staff that holds several voices (a SATB system on two staves) is listed as the parts the file declares, and the vocal filter cannot split them further; the viewer says so rather than guessing.

`partSelection` per source defaults to `'vocal'` (show every part not known to be instrumental, so a part with no telling name is never hidden; if none is recognized as vocal, show all and say that no vocal parts were recognized). The viewer lists the parts as chips with `Vocal parts`, `All parts`, and per-part toggles; the choice is saved on the source so a separate `Alto part` source stays on its alto line. A saved `include` list refers to parts by index and name together (`0:Soprano`), and when the file changes so a saved part is missing, the selection falls back to `vocal`.

### Decision 13: Reaching sheet music, and keeping it non-standard

Decided by the user on 2026-10-14 from the HTML mock in `design-source/sheet-music-entry-mock.html` (Option A over a `View sheet music` shortcut).

- One menu action, `Sheet music`, after `Lyrics` / `Edit lyrics`, with its own icon in the shared icon map, on the same menus as the lyrics action (Library views, Recents, Up Next, playback sheet) and never in bulk menus. It always reads `Sheet music`; it opens the manager sheet.
- The **manager sheet** lists the track's sources (label, format, a `View` action, remove, rename) and holds `Add sheet music` with three paths: `From Google Drive`, `From a web link`, and `Search MuseScore`. Rows that cannot be rendered say `Opens outside the app`.
- Opening a source opens the **full-screen viewer** only. There is no sheet music section, preview, mini-player control, or empty-state prompt on the playback screen, and playback controls stay reachable through a compact play/pause control as in lyrics reading mode, with the screen kept awake via the same `expo-keep-awake` use.
- The Drive picker reuses the app's Drive browsing and search surfaces with a kind parameter on the query builders (spike 9.6: the queries hardcode `audio/`), filtering by MIME type and by extension because Drive often labels `.mxl`, `.musicxml`, and `.mscz` as generic types; the web link path is a pasted URL, validated and detected on the spot.

### Decision 14: Loading is on demand, typed, and cancellable

A `SheetMusicLoader` fetches a source only when the viewer opens it, with an injected `fetch`, an `AbortSignal`, a 30 s timeout and a 25 MB size limit, and returns a typed result: `loaded`, or `failed` with `needs-drive-access`, `not-found`, `blocked` (a web host that does not allow browser requests, CORS), `too-large`, `unsupported`, `offline`, or `unavailable`. It never throws into the UI. Drive files reuse the audio path's authorized download (and the existing `Drive access expired` handling); URL sources are fetched directly. On the web a CORS block and an unreachable host both surface as `TypeError: Failed to fetch`, so after a failure the loader probes with `fetch(url, { mode: 'no-cors' })` (spike 9.5): an opaque response means `blocked`, a rejection means `offline` or `unavailable`. When a browser blocks a host the viewer offers `Open in browser` and suggests saving the file to Drive. Nothing is sent to us, and the only data that leaves the device is the request for the file itself.

### Decision 15: Tests for sheet music

Pure logic gets `node:test` specs: format detection (Drive MIME and URL cases, MuseScore pages, refused formats), source normalization and the 10-source cap, owner resolution for sheet music, part extraction and vocal classification on small fixture MusicXML and MIDI files (SATB score, piano-vocal, a part-only file, an unnamed MIDI track), part selection fallbacks, the MuseScore search URL, the loader against a fake `fetch` (each failure), and the viewer's state model (source switching, part toggles, error states). Renderers are verified in the browser preview with fixture files, since the repo has no harness for rendering components (task 8.3).

## Risks / Trade-offs

- [The lyrics service is a third party: it can change, rate-limit, or disappear] → The lookup is optional and behind an interface; typed and pasted lyrics need no network; failures are typed and show a retry and the `Search the web` fallback.
- [Copyright: looked-up lyrics are third-party text] → Text is only stored in the user's own on-device library, is never shared or synced by the app, is attributed as looked up, and the user reviews it before saving; the service's own terms apply to the lookup. Record this in the README note.
- [Privacy: title, artist, and duration leave the device on lookup] → Lookup is user-initiated, disclosed once before the first call, and sends nothing else.
- [Track names are poor search keys, so matches may be wrong] → The user edits Title and Artist before searching, sees title, artist, and length difference per candidate, and can always type instead.
- [Web build and CORS: a browser may block the service] → Verify on the deployed web build early (task 3.x); if blocked, the web path falls back to `Search the web` and paste, with the editor hiding `Look up` when the client reports `unavailable`.
- [Long lyrics in a small panel] → The playback section collapses; reading mode is the place for long text; the 20,000-character cap keeps rendering cheap.
- [One body per track means a singer cannot keep a translation] → Accepted for now; a second body or a free-form notes field is a later change.
- [Sheet music: MuseScore cannot be rendered or searched through an API] → Search is a system browser search; the app renders only what the user brings back as a file or link in a supported format, and says plainly that MuseScore files open outside the app (Decision 10).
- [Sheet music: MIDI notation can look wrong] → Not labelled (a generic "approximate" note gives a singer nothing to act on), with the source file one tap away from the manager sheet; spike 9.3 decides whether it ships at all and, if not, MIDI is accepted as a link-out.
- [Sheet music: vocal part detection is a heuristic] → The user can always choose parts by hand, the choice is saved per source, and an unrecognized file shows everything with a notice rather than hiding music.
- [Sheet music: rendering libraries are large and untested in this Expo build] → Loaded on demand from the viewer only; spikes 9.1 and 9.2 confirm they bundle and run before any other work depends on them.
- [Sheet music: arbitrary web hosts block browser requests (CORS)] → A typed `blocked` result with `Open in browser`, and the suggestion to save the file to Drive, which always works through the user's authorization.
- [Sheet music: copyright of linked scores] → Only links and settings are stored; the app never copies, hosts, or shares a score, and does not scrape MuseScore.
- [Sheet music: native renderers are not in this change] → The shared model and the viewer contract land here; native rendering is recorded in `native-playback-follow-ups`. Until then a native build shows the source list and opens sources outside the app.

## Migration Plan

No data migration: the `lyrics` and `sheetMusic` fields are optional and absent on every existing record. Rolling back the change leaves those fields on stored records that older code ignores because the parser only reads fields it knows. Ship behind no flag; the sheet music renderers' libraries load only when a viewer opens.

## Open Questions

- Should reading mode keep the screen awake (adds `expo-keep-awake`)? Default to yes if the dependency is acceptable; confirm with the user in the reading-mode task.
- Is a looked-up result worth an artist field on the track later (so the next lookup needs no typing)? Out of scope here; revisit after use.
- Should `Search the web` be configurable (another search engine)? Default to one fixed engine for now.
- Sheet music, MuseScore files: link-out for `.mscz` and `musescore.com` pages was accepted by the user on 2026-10-14 (Decision 10). Task 9.4 still re-confirms the facts it rests on.
- Sheet music, MIDI: decided 2026-10-14 to ship the notation, and 2026-10-15 **not to label it** as approximate: the user judged the text not useful, since it says nothing a singer can act on. The converter still reports an `origin`, so a future, more specific message (for example offering to open the original MIDI) can be added without changing it.
- Sheet music, entry point: **decided 2026-10-14, Option A** (one `Sheet music` action that always opens the manager sheet). A `View sheet music` shortcut for tracks with one source (Option B) stays a possible later addition. The HTML mock of both options is saved at `design-source/sheet-music-entry-mock.html`.
- Sheet music, offline: should opened files be cached for offline use? It belongs with `offline-audio-caching`; not built here.
