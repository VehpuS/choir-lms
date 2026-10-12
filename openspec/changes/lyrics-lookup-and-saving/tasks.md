## 1. Model, storage, and ownership

- [ ] 1.1 Add `lyrics?: { text; updatedAt; origin: 'looked-up' | 'typed' }` to `DriveAudioSource` in `packages/audio-library-models`, with a `normalizeLyricsText` helper (line endings, trailing whitespace, blank-line runs, 20,000-character limit) and parsing of the field where a source is read from storage (design Decision 1). An empty body removes the field. Spec the helper and the parser, including a malformed `lyrics` value being dropped rather than failing the read.
- [ ] 1.2 Add `resolveLyricsOwner(item, sources)` to `audio-library-models`: a track resolves to itself, an adjusted track to its `adjustment.sourceRef`, a loop through `sourceId` (then the same adjusted-track hop), and a missing owner to `null` (Decision 2). Spec every case, including a loop of an adjusted track and a deleted owner.
- [ ] 1.3 Persist the field through the practice repository and the AsyncStorage implementation in `packages/audio-library-runtime`, with a `saveSourceLyrics` / `clearSourceLyrics` operation that updates only that field and `updatedAt`. Round-trip it in the storage specs and confirm an old record without the field still loads. Confirm removing a track removes its lyrics and that `Create a copy` of a Files link still points at the same source.
- [ ] 1.4 Expose lyrics through the app's library controller (`use-rehearsal-library-controller`) so views read `lyricsFor(item)` via the resolver and write through the repository, with a controller spec for save, edit, clear, and a derived item.

## 2. Lookup client

- [ ] 2.1 Add the pure title/artist helpers in `library/lyrics/`: `suggestLyricsTitle(trackName)` (drop extension, leading track numbers, `_`) and `buildLyricsWebSearchUrl({ title, artist })` (encoded, ending in `lyrics`). Spec them with real-world file names.
- [ ] 2.2 Add `LyricsLookupClient` and the LRCLIB implementation (design Decision 3): injected `fetch` and `AbortSignal`, 10 s timeout, candidates with title, artist, duration, and plain lyrics only, timestamp markers stripped, typed failures (`offline`, `rate-limited`, `unavailable`, `no-results`) and never a thrown error. Spec against fixture responses and a fake `fetch` for success, empty, 429, network failure, malformed JSON, and abort.
- [ ] 2.3 Verify the lookup against the real service from the web build before building the editor on it: confirm CORS, response shape, and rate limits with one manual call, and record the result here. If the browser blocks it, decide with the user whether web hides `Look up` (design Risks).

## 3. Lyrics editor

- [ ] 3.1 Build `LyricsEditorSheet` (design Decision 5): Title and Artist fields, `Look up`, `Search the web` (through the existing `openUrl` seam), a multiline text field with character count and the 20,000 limit, `Save` and `Cancel`, the `Lyrics for <track name>` subtitle, and `Delete lyrics` with confirmation. Use Nocturne tokens only, sentence-case copy, 44pt controls, and a state model that is specced separately from the component.
- [ ] 3.2 Wire lookup into the editor: candidate list (title, artist, length difference), choosing a candidate loads text without saving, the first-lookup disclosure (acknowledgement remembered per device), and the typed failure messages with `Try again`. Spec the editor state model for every scenario in `track-lyrics`, then render-test the discard confirmation and the no-results and offline states.
- [ ] 3.3 Verify the editor in the browser preview: type and save, look up and edit before saving, search the web, discard, delete, and restart persistence. Record a screenshot-level result here.

## 4. Menu entry

- [ ] 4.1 Add the `Lyrics` / `Edit lyrics` action to the shared saved-item menu (after `Edit tags`) for tracks, loops, and adjusted tracks, add both labels and a Phosphor glyph (for example `TextAlignLeft`) to `menu-action-icons.ts`, and extend `menu-action-icons.spec.ts` and the saved-item menu specs. Confirm bulk menus do not gain the action.

## 5. Viewing during playback

- [ ] 5.1 Add the device-level text-size preference (`Small`, `Medium`, `Large`, `Extra large`) with its storage, defaults, and a model spec; add the matching type tokens to the theme and a contrast spec that checks lyrics text at every size on the ground.
- [ ] 5.2 Add the `Lyrics` section to the playback screen (`routing/playback/now-playing/`): collapsed preview with `Show all` and `Edit`, `Add lyrics` empty state, owner resolution, and no layout shift when the current item changes. Spec the section model for with-lyrics, empty, and owner-missing.
- [ ] 5.3 Add the mini-player `Lyrics` control (only while the playing item has lyrics) and the half-height peek with `Expand` and `Edit`. Spec the visibility rule.
- [ ] 5.4 Add full-screen reading mode with the text-size control, close control, selectable text, Nocturne high-contrast column, and playback controls still reachable. Decide with the user whether it keeps the screen awake (adds `expo-keep-awake`) before adding the dependency.
- [ ] 5.5 Verify the three viewing surfaces in the browser preview with playback muted: section, peek, reading mode at every size, switching tracks, and a loop and an adjusted track resolving to the parent lyrics.

## 6. Validation and documentation

- [ ] 6.1 Run `typecheck`, `lint`, `test`, and `build` for every touched project, format only touched files, and keep touched files under 300 lines or extract helpers.
- [ ] 6.2 Add a README note on lyrics (what is stored, where lookup comes from, what is sent, and that text stays on the device) and update `docs/` if the playback screen module map changes.

## 7. Follow-ups (not scheduled)

- [ ] 7.1 Native verification of the editor, the peek, and reading mode on iOS and Android (keyboard handling, selection, safe areas). Move to `native-playback-follow-ups` once that change is picked up.
- [ ] 7.2 Explore with the user: remembering an artist on the track so lookups need no typing, a second text body (for example a translation), and configurable web search.
