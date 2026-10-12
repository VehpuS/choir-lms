## Why

Singers rehearse from words as much as from sound, but the app only plays audio: lyrics live in other apps and browser tabs, so a singer leaves the rehearsal player mid-practice to read them. Letting users bring lyrics into the library, next to the track, and read them during playback closes that gap.

## What Changes

- Add per-track lyrics: users can type, paste, edit, and delete the lyrics of a saved track, stored with the saved track in the library like its tags.
- Add lyrics lookup from three entry points in one editor: an open lyrics service (suggestions the user reviews and edits before saving), a `Search the web` action that opens the system browser on a prepared query, and plain typing or pasting. Lookup is always user-initiated and never saves anything by itself.
- Show lyrics during playback: a Lyrics section on the full playback screen with adjustable text size, a quick-open peek from the mini-player so lyrics can be read without leaving the current screen, and a full-screen reading mode that suits a dim room.
- Share one set of lyrics across everything derived from a track: its loops and its adjusted copies read the parent track's lyrics rather than keeping their own.
- Add a `Lyrics` action to the saved-item menu of tracks (and read-only entry points for loops and adjusted tracks) with an icon from the shared menu icon map.
- Out of scope: word tracking, auto-scrolling, timed or synced lyrics, and sharing lyrics between users.

## Capabilities

### New Capabilities

- `track-lyrics`: storing, editing, deleting, and looking up the lyrics of a saved track, and how loops and adjusted tracks resolve to their parent track's lyrics.

### Modified Capabilities

- `mobile-rehearsal-player-ui`: adds the Lyrics section on the playback screen, the mini-player peek, the full-screen reading mode, and the text-size control.
- `mobile-library-organization`: adds the `Lyrics` action to the shared saved-item menu and states what removing or copying a track does to its lyrics.

## Impact

- `packages/audio-library-models`: an optional `lyrics` field on `DriveAudioSource`, its parsing and normalization at the storage boundary, and a resolver from a loop or adjusted track to the track that owns its lyrics.
- `packages/audio-library-runtime`: repository and AsyncStorage persistence for the field (no key migration; old records simply have no lyrics), and the library batch operations that copy, adjust, or remove a track.
- `packages/mobile-rehearsal-player`: a lyrics editor sheet, the lyrics lookup client, the playback Lyrics section and reading mode, the mini-player peek, the item menu action and icon, and a device-level text-size preference.
- A new network call to a third-party lyrics service (artist and title, and the track duration, are sent when the user taps `Look up`); the editor must say so before the first lookup.
- No new native dependency is required for the core change; keeping the screen awake in reading mode is an optional dependency decided in design.
- README gets a short note on the new capability.
