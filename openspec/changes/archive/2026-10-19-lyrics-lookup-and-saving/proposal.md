## Why

Singers rehearse from words as much as from sound, but the app only plays audio: lyrics live in other apps and browser tabs, so a singer leaves the rehearsal player mid-practice to read them. Letting users bring lyrics into the library, next to the track, and read them during playback closes that gap.

Singers also rehearse from notes. Sheet music lives in Drive folders, PDFs, MuseScore pages, and MusicXML or MIDI files, so a singer leaves the app to find the right part. Letting a track carry links to its sheet music, and opening it full screen with only the singer's own vocal part shown, closes the same gap. This is a secondary tool for the singers who want it, so it stays out of the way of the lyrics and the playback screen.

> **Scope note (2026-10-14):** this change was expanded from lyrics only to lyrics plus sheet music. The directory keeps its original name `lyrics-lookup-and-saving` so existing links and the task history stay valid; rename it when archiving if a broader name is wanted (for example `lyrics-and-sheet-music`).

## What Changes

- Add per-track lyrics: users can type, paste, edit, and delete the lyrics of a saved track, stored with the saved track in the library like its tags.
- Add lyrics lookup from three entry points in one editor: an open lyrics service (suggestions the user reviews and edits before saving), a `Search the web` action that opens the system browser on a prepared query, and plain typing or pasting. Lookup is always user-initiated and never saves anything by itself.
- Show lyrics during playback: a Lyrics section on the full playback screen with adjustable text size, a quick-open peek from the mini-player so lyrics can be read without leaving the current screen, and a full-screen reading mode that suits a dim room.
- Share one set of lyrics across everything derived from a track: its loops and its adjusted copies read the parent track's lyrics rather than keeping their own.
- Add a `Lyrics` action to the saved-item menu of tracks (and read-only entry points for loops and adjusted tracks) with an icon from the shared menu icon map.
- Add optional sheet music links to a saved track: zero or more sources per track (for example the full score and one part), each a Google Drive file or a web URL, with a label. Sheet music is a non-standard option: it has no section, preview, or empty-state prompt on the playback screen, and it is reached from the item menu.
- Add sources three ways: pick a file from Google Drive, paste a web URL, or `Search MuseScore` (opens the system browser on a prepared MuseScore search; the user brings the result back as a link or a Drive file).
- Open sheet music only in full: a full-screen viewer that renders PDF pages, and renders MusicXML (`.musicxml`, `.xml`, `.mxl`) and MIDI as staves, with a source switcher when a track has several. MuseScore files and pages are handled as decided in the design (link out, not rendered in the app).
- Filter parts in MusicXML and MIDI: show the vocal parts by default, let the user choose which parts to show, and remember the choice per source.
- Share sheet music across everything derived from a track, exactly as lyrics are shared (loops and adjusted copies read the parent track's sources).
- Add a `Sheet music` action to the saved-item menu, after `Lyrics` / `Edit lyrics`.
- Out of scope: word tracking, auto-scrolling, timed or synced lyrics, sharing lyrics between users; and for sheet music, following the music in time with playback, editing or transposing scores, annotation, printing, MuseScore account integration, a MuseScore catalogue or any server we operate, and bundling or redistributing sheet music.

## Capabilities

### New Capabilities

- `track-lyrics`: storing, editing, deleting, and looking up the lyrics of a saved track, and how loops and adjusted tracks resolve to their parent track's lyrics.

- `track-sheet-music`: attaching, labelling, removing, and opening sheet music sources on a saved track; formats, rendering, part filtering, loading failures, and how derived items resolve to the owning track.

### Modified Capabilities

- `mobile-rehearsal-player-ui`: adds the Lyrics section on the playback screen, the mini-player peek, the full-screen reading mode, and the text-size control; and the full-screen sheet music viewer, which has no playback-screen preview.
- `mobile-library-organization`: adds the `Lyrics` and `Sheet music` actions to the shared saved-item menu and states what removing or copying a track does to its lyrics and sheet music links.

## Impact

- `packages/audio-library-models`: an optional `lyrics` field on `DriveAudioSource`, its parsing and normalization at the storage boundary, and a resolver from a loop or adjusted track to the track that owns its lyrics.
- `packages/audio-library-runtime`: repository and AsyncStorage persistence for the field (no key migration; old records simply have no lyrics), and the library batch operations that copy, adjust, or remove a track.
- `packages/mobile-rehearsal-player`: a lyrics editor sheet, the lyrics lookup client, the playback Lyrics section and reading mode, the mini-player peek, the item menu action and icon, and a device-level text-size preference.
- A new network call to a third-party lyrics service (artist and title, and the track duration, are sent when the user taps `Look up`); the editor must say so before the first lookup.
- No new native dependency is required for the core change; keeping the screen awake in reading mode is an optional dependency decided in design.
- README gets a short note on the new capability.
- Sheet music, `packages/audio-library-models`: an optional `sheetMusic` list on `DriveAudioSource` (links, labels, detected format, part selection), format detection, and the same owner resolver as lyrics.
- Sheet music, `packages/audio-library-runtime`: persistence and add, update, and remove operations for the list; no key migration.
- Sheet music, `packages/mobile-rehearsal-player`: a sheet music manager sheet and a Drive picker for non-audio files, the web URL and MuseScore search entry, source loaders, a part extraction and vocal classification model for MusicXML and MIDI, lazily loaded renderers, and the full-screen viewer.
- New runtime dependencies for rendering, loaded only when the viewer opens: a PDF renderer (pdf.js is the candidate), OpenSheetMusicDisplay (MusicXML, built on VexFlow), and a MIDI parser plus a MIDI-to-notation step; each chosen in the design spikes (tasks 9.x) before it is added.
- New network calls: Drive file downloads with the user's existing authorization, and requests to whatever host a pasted URL names, made only when the user opens that source. Nothing is uploaded, and nothing is fetched until the viewer opens a source.
- Native rendering is split out: this change targets the web build and the shared model, and the iOS and Android renderers and their device checks go to `native-playback-follow-ups`.
