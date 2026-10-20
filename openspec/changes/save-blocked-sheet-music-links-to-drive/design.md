## Context

The web sheet music viewer fetches a source in the browser (`sheet-music-loader.ts`). Drive sources use the Drive media endpoint with the user's token and work; URL sources are plain `fetch` calls, so a host without CORS headers fails with a `TypeError` that the loader classifies as `blocked` (a `no-cors` probe resolves for a host that answered). The failure card then says to open the file in the browser "or save the file to Google Drive", with no flow behind the second half.

Drive authorization asks for one scope, `https://www.googleapis.com/auth/drive.readonly` (`app.config.ts`, `config/defaults.ts`, `runtimeConfig.google.driveScope`). The session stores the scope string Google granted (`authorization.ts`, `DRIVE_AUTH_SESSION_KEY`), which is what lets the app tell what a stored token can do. Drive files already render correctly in the viewer (PDF, `.xml`, `.musicxml`, MuseScore 3 exports, large scores with lyrics), so no renderer change is needed for the main fix.

A separate defect: `inspectSheetMusicBytes` reads bytes as Latin-1 and searches for `<score-partwise`, which never matches UTF-16 text.

Constraints: the app has no backend, the sheet music rule that "the app never downloads from these sites" stays, shared packages stay framework-agnostic, and native rendering is out of scope.

## Goals / Non-Goals

**Goals:**

- A blocked link, or a file on the user's device, can become a Drive-backed source in a few taps, without the app reading the blocked site.
- Ask for the narrowest extra permission that makes this work, and keep every existing session usable.
- UTF-16 and BOM-prefixed MusicXML opens, and the viewer says what is wrong with a file it cannot open.
- Give the project owner exact Google Cloud console steps and a way to confirm the scope is granted.

**Non-Goals:**

- A proxy or backend to fetch blocked links on the user's behalf.
- Native iOS and Android rendering or the native file picker (their own change, `native-playback-follow-ups` 1.6).
- Converting MuseScore (`.mscz`, `.mscx`) files, or any other new format.
- Bulk upload, editing Drive files, or deleting what the app uploaded.

## Decisions

### 1. Request `drive.file` in addition to `drive.readonly`

The app requests both scopes. `drive.file` lets the app create files and read or modify only files it created (or the user opened with it); `drive.readonly` keeps covering everything else the app already reads. A file the app uploads is readable under either scope, so the viewer needs no change to open the copy.

- **Why not `drive`:** it is a restricted scope with full read and write over the whole Drive. Nothing here needs it, and it would raise the bar for verification and for user trust.
- **Why not `drive.appdata`:** the copy must be a normal, visible file in a folder the user knows (they may want to find or share it).
- **Why not the Google Picker:** it needs an extra API key and script, and the app already has its own Drive folder browser.
- **Verification state:** `drive.file` is a non-sensitive scope, so adding it does not change the app's verification requirements; `drive.readonly` is the restricted scope that already governs them.

The scope strings live in one place: `DEFAULT_GOOGLE_DRIVE_SCOPE` stays `drive.readonly` and a new `DEFAULT_GOOGLE_DRIVE_WRITE_SCOPE` is `drive.file`, both exposed through runtime config (`driveScope`, `driveWriteScope`). `use-authorization` passes both to `Google.useAuthRequest({ scopes })`. `app.config.ts` repeats the defaults (Expo evaluates it before `src/` is available), so both files change together.

### 2. Detect the granted scope; re-consent only when saving

`@org/google-drive` gets `hasDriveWriteScope(scope)` that splits the granted scope string on whitespace and looks for `drive.file` (or the broader `drive`). Reading never checks it. The save flow checks it first and, when it is missing, shows an `Allow saving to Drive` step that calls `startAuthorization` (the existing explicit reconnect path, which must come from a tap because browsers block popups otherwise). Because both scopes are requested together, Google's consent screen lists only what is new for a user who already granted `drive.readonly`.

- **Why not force everyone to re-consent at load:** it would interrupt every existing session for a feature most users reach rarely, and the app has deliberately avoided silent or surprise sign-in popups.
- **Why not a second token:** one authorization state is simpler, and the scope string already tells us what the token can do.

If Google returns a token without `drive.file` (the user unticked it on the consent screen), the save flow stays on `Allow saving to Drive` and says what was missing; reading keeps working.

### 3. Getting the file: the user downloads it, the app never fetches it

The failure card's `Save to Drive` opens a short sheet with two steps: `Open the link` (opens the URL in a new browser tab) and `Choose the downloaded file` (an `<input type="file">` accepting `.pdf,.xml,.musicxml,.mxl,.mid,.midi`). The sheet is also reachable from the manager row menu for any link, and offers the file chooser alone when started from `Add sheet music` ("From this device"). On web a file the user picks is read in memory; it is never stored by the app.

The chosen bytes are checked with `inspectSheetMusicBytes` (using the new decoder) before upload, so an HTML error page or a wrong file is refused with the viewer's own wording instead of landing in Drive. The 25 MB limit applies to the file picked.

- **Why not fetch through a CORS proxy:** it needs a backend, sends the user's browsing to a third party, and contradicts "the app never downloads from these sites".
- **Why not `no-cors` fetch:** the response is opaque; its bytes cannot be read.

### 4. Destination folder and upload

The user picks a destination with the existing Drive folder browser in a folder-choosing mode (only folders, a `Save here` action, a remembered last folder). The upload is `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType` with metadata `{ name, parents: [folderId] }` and the file as the second part, authorized with the bearer token. A new helper in `@org/google-drive` (`uploadDriveFile`) returns the new file's id and name or a typed failure (`needs-write-access`, `quota`, `folder-not-writable`, `offline`, `too-large`, `unavailable`). The Drive upload endpoint allows browser requests, and the existing client already calls the Drive API from the web build.

Spike first (task 1.2): confirm that with only `drive.file` plus `drive.readonly` a file can be created inside a folder the app did not create. If Drive refuses, the fallback is for the app to create and reuse one `Choir LMS sheet music` folder in My Drive and say so, and the folder picker task shrinks to that.

The file name is the picked file's name. Drive permits duplicate names, so no overwrite or de-duplication logic is added; saving twice makes two files, and the source swap in Decision 5 points at the one just made.

### 5. Swapping the source

A pure function in `@org/audio-library-models` (`replaceSourceLocationWithDrive(sources, sourceId, { fileId, name })`) returns the sources with that source's `location` replaced by `{ kind: 'drive', fileId, name }`, its `format` re-detected from the file name, and its `id`, `label`, `partSelection`, and `addedAt` kept. It does nothing when the id is gone, so a source removed while the upload ran is not resurrected. From `Add sheet music` the same upload adds a new Drive source instead of replacing one, through the existing add path and its 10-source limit. The viewer then reloads the source from Drive, which already works.

### 6. Text decoding at the boundary

A small pure `decodeMusicXmlBytes(bytes)` (in a new `musicxml-encoding.ts` beside `sheet-music-content.ts`) handles a UTF-8 BOM, UTF-16 LE and BE with a BOM, and BOM-less UTF-16 detected from the first bytes (`3C 00 3F 00` or `00 3C 00 3F`), and otherwise decodes UTF-8. Two places read bytes as text today and both change: `inspectSheetMusicBytes` (Latin-1 header window, which is why UTF-16 never matches `<score-partwise`) now decodes the header window with it, and `readMusicXmlText` in `renderers/musicxml-text.ts` (a hard-coded `TextDecoder('utf-8')`, which already drops a UTF-8 BOM but turns UTF-16 into garbage) calls the same function, so what passed the check is what gets parsed. The decoded text's XML declaration may still say `encoding="UTF-16"`; it is passed to OpenSheetMusicDisplay as a JavaScript string, so the declaration is rewritten to UTF-8 only if the parser rejects it (verified in task 2.3). Compressed `.mxl` is unchanged (the zip signature is checked first). The inspection result gains a `reason` (`html-page`, `not-musicxml`, `unreadable-encoding`) used only to choose failure copy.

### 7. Failure copy

`blocked` says the site does not let the app read the file and offers `Save to Drive` (and `Open in browser`); `offline` says the site could not be reached; `unsupported` says the specific reason when one is known. The strings stay in the viewer model (`viewer/model.ts`), tested as pure functions, and the native "not shown on this device yet" card is unchanged.

## Google Cloud console setup (project owner)

These steps are done once in the Google Cloud project that owns the app's OAuth clients. No new client ID, redirect URI, or `.env` value is needed.

1. Open the project in the console and confirm **APIs & Services → Library → Google Drive API** shows `Enabled`.
2. Open **Google Auth Platform → Data Access** (older consoles: **APIs & Services → OAuth consent screen → Edit app → Scopes**).
3. Choose **Add or remove scopes**. Under **Manually add scopes** paste `https://www.googleapis.com/auth/drive.file` and **Add to table**. In the table it appears as _See, edit, create, and delete only the specific Google Drive files you use with this app_. Keep `https://www.googleapis.com/auth/drive.readonly` ticked. **Update**, then **Save**.
4. Open **Audience**. While the app is in **Testing**, only listed **Test users** can sign in, so add every account that will use the feature. In Testing, Google also expires consent after 7 days, so a user may be asked to approve again.
5. Leave **Clients** unchanged. The web client's authorized JavaScript origins and redirect URIs are the same as today.

Confirming it works (after the sign-in change ships):

- The consent screen shown on first save lists _See, edit, create, and delete only the specific Google Drive files you use with this app_ alongside the existing read permission. If it does not, step 3 was not saved.
- The session's stored `scope` (web: the `choirlms.google-drive.authorization` value) contains `drive.file`. Independently, `https://oauth2.googleapis.com/tokeninfo?access_token=<token>` returns a `scope` field containing both scopes.
- `https://myaccount.google.com/connections` lists the app with the access it was given; removing it there is how a user revokes the write permission.
- An upload without the scope fails with HTTP 403 (`insufficientPermissions`), which the app maps to `Allow saving to Drive`.

## Risks / Trade-offs

- [Drive refuses to create a file in a folder the app did not make under `drive.file`] → Spike in task 1.2 before building the folder picker; fall back to one app-created folder.
- [A user denies the new permission on the consent screen] → Save stays on `Allow saving to Drive` with a clear message; reading and everything else are unaffected.
- [Testing-mode audience expires consent after 7 days] → Documented above; moving the app out of Testing is a separate decision for the owner.
- [The user picks the wrong file] → Content check before upload, and the swap is a source edit that can be undone by re-adding the link.
- [Uploading copies a possibly copyrighted score into the user's own Drive] → The user performs the download and the upload; the app stores nothing and the copy is theirs. The add flow's existing "the app never downloads from these sites" notice stays accurate.
- [A 25 MB upload on a slow connection] → Show progress and a cancel (abort the request), and leave the source unchanged on failure.
- [Two scopes in `app.config.ts` and `defaults.ts` drifting] → A spec asserts both files carry the same scope list.

## Migration Plan

1. Owner adds the scope in the console (steps above) before the app change is released; it is harmless until the app requests it.
2. Ship the app change. Existing sessions keep reading; saving prompts for the new permission on first use.
3. Rollback: remove the `drive.file` request and hide `Save to Drive`; already uploaded files remain in the user's Drive and keep working as Drive sources through `drive.readonly`.

## Open Questions

- Should the destination folder default to the track's own Drive folder (`sourceLocation.parentFolderId`) when it has one? It is the likeliest place the user wants the score, and the picker would open there.
- Should a successful save offer to open the file in the viewer immediately? The plan is yes, since that is why the user started.
