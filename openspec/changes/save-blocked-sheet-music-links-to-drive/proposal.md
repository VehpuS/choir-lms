## Why

On the web build, a sheet music link to another website usually cannot be opened: the browser refuses to let the app read a file from a host that does not send CORS headers, so the viewer says "This site does not allow the app to load the file" and can only suggest saving the file to Drive. That suggestion has no flow behind it, so the most common source of choir scores (a downloaded PDF or MusicXML from a score site) still cannot be viewed in the app. Checking the viewer against real Drive files (PDF, `.xml`, `.musicxml`, MuseScore 3 exports, large full scores, all with lyrics) showed that Drive sources already render correctly, so the fix is to get blocked files into Drive, not to change the renderers.

Separately, MusicXML saved as UTF-16 (written by some Finale and Sibelius exports) is rejected as "not a readable PDF, MusicXML, or MIDI file", because the content check reads bytes as Latin-1 and never finds the root tag.

## What Changes

- A blocked web link gets a `Save to Drive` action on its failure card. The action opens the link in the browser so the user can download the file themselves, asks the user to pick the downloaded file, uploads it to a Drive folder the user chooses, and replaces the link source with a Drive source of the same label and part selection. The app never fetches the blocked site.
- The same flow is available from the manager sheet's row menu for any link source, and the file picker also accepts a file already on the device, so a score the user has on hand can go to Drive without a link.
- Drive authorization asks for one more scope, `https://www.googleapis.com/auth/drive.file` (per-file access to files the app creates), next to the existing `drive.readonly`. Existing sessions keep working for reading; a session without the new scope shows an `Allow saving to Drive` step when the user first tries to save, which re-runs sign-in with both scopes.
- The content check decodes UTF-16 (byte-order mark or `<\0?\0x\0m\0l\0` start) and UTF-8 with a BOM before looking for the MusicXML root, and the renderer receives text it can parse. A file that still cannot be read says what was wrong (HTML page, not MusicXML, unreadable encoding) instead of one generic message.
- The failure copy distinguishes a blocked host, an unreachable host, and a bad file, and no longer implies that `Open in browser` fixes a blocked link.
- Setup documentation: the README gains the Google Cloud console steps for the new scope (Data Access, test users, verification state, and how to confirm the granted scopes).

Native iOS and Android sheet music rendering stays out of scope here; it is tracked in `native-playback-follow-ups` 1.6 and will get its own change. MuseScore (`.mscz`, `.mscx`) files still open outside the app.

## Capabilities

### New Capabilities

- `sheet-music-save-to-drive`: copying a sheet music file the browser cannot read, or a file from the device, into the user's Drive and pointing the source at the copy, including the scope it needs and how a session without that scope is handled.

### Modified Capabilities

- `track-sheet-music`: the "Loading a source is on demand and fails clearly" requirement changes (blocked-host failure offers `Save to Drive`; encodings and failure copy are specified), and a requirement is added that MusicXML in UTF-8 (with or without a BOM) or UTF-16 opens.

## Impact

- `packages/google-drive`: a multipart upload helper (`files.create` with a parent folder), the `drive.file` scope constant, and a check for whether a granted scope string includes it.
- `packages/mobile-rehearsal-player`: runtime config (`driveWriteScope`) and `use-authorization` (request both scopes, detect a missing write scope, re-consent), the sheet music viewer failure card and manager row menu, a web file picker, a Drive folder picker for the destination, and the content check in `sheet-music-content.ts` plus a text decoder at the loader boundary.
- `packages/audio-library-models`: the pure rule that swaps a source's location for a Drive location while keeping its id, label, and part selection.
- Google Cloud project: the OAuth consent screen must list the `drive.file` scope (see design). No new keys or client IDs.
- Privacy: the app only ever writes files the user explicitly chose, to a folder the user chose; it does not request any broader write scope.
- Native: the save flow needs a document picker and is deferred with native rendering; on iOS and Android the failure card keeps today's behavior.
