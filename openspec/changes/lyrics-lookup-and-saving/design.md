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

## Risks / Trade-offs

- [The lyrics service is a third party: it can change, rate-limit, or disappear] → The lookup is optional and behind an interface; typed and pasted lyrics need no network; failures are typed and show a retry and the `Search the web` fallback.
- [Copyright: looked-up lyrics are third-party text] → Text is only stored in the user's own on-device library, is never shared or synced by the app, is attributed as looked up, and the user reviews it before saving; the service's own terms apply to the lookup. Record this in the README note.
- [Privacy: title, artist, and duration leave the device on lookup] → Lookup is user-initiated, disclosed once before the first call, and sends nothing else.
- [Track names are poor search keys, so matches may be wrong] → The user edits Title and Artist before searching, sees title, artist, and length difference per candidate, and can always type instead.
- [Web build and CORS: a browser may block the service] → Verify on the deployed web build early (task 3.x); if blocked, the web path falls back to `Search the web` and paste, with the editor hiding `Look up` when the client reports `unavailable`.
- [Long lyrics in a small panel] → The playback section collapses; reading mode is the place for long text; the 20,000-character cap keeps rendering cheap.
- [One body per track means a singer cannot keep a translation] → Accepted for now; a second body or a free-form notes field is a later change.

## Migration Plan

No data migration: the field is optional and absent on every existing record. Rolling back the change leaves a `lyrics` field on stored records that older code ignores because the parser only reads fields it knows. Ship behind no flag.

## Open Questions

- Should reading mode keep the screen awake (adds `expo-keep-awake`)? Default to yes if the dependency is acceptable; confirm with the user in the reading-mode task.
- Is a looked-up result worth an artist field on the track later (so the next lookup needs no typing)? Out of scope here; revisit after use.
- Should `Search the web` be configurable (another search engine)? Default to one fixed engine for now.
