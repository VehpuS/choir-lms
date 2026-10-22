## 1. Console setup and spikes

- [x] 1.1 **Owner: add the scope in Google Cloud** by following "Google Cloud console setup" in `design.md` (Data Access → add `https://www.googleapis.com/auth/drive.file`, keep `drive.readonly`; add test users under Audience). Record in this task that it is done and which project it was done in. Nothing in the app depends on it until group 3 ships. _Reported done by the owner on 2026-10-22 (project name not recorded; group 3's consent screen check, 3.5, confirms it took effect)._
- [x] 1.2 **Spike: can `drive.file` create into a folder the app did not make?** With a token holding both scopes, `POST` a small PDF to a folder in My Drive the app did not create, from the web build. Record the result in `design.md` Decision 4. _Needs a token that holds `drive.file`, which the app only requests after 3.3, so run it right after 3.3 (or earlier via the Google OAuth Playground)._ _Result: allowed (HTTP 200 into a folder the app did not make); tasks 4.1 and 4.2 stay as written. See design Decision 4._ If refused, change tasks 4.1 and 4.2 to the one app-created `Choir LMS sheet music` folder and note it in the spec delta's folder wording.
- [x] 1.3 **Spike: UTF-16 through OpenSheetMusicDisplay.** Decode a UTF-16 MusicXML to a string and load it in the web renderer; record whether an `encoding="UTF-16"` declaration must be rewritten (design Decision 6).

## 2. UTF-16 and encoding fix (shippable on its own)

- [x] 2.1 Add `musicxml-encoding.ts` with `decodeMusicXmlBytes` (UTF-8 with and without BOM, UTF-16 LE and BE with a BOM, BOM-less UTF-16 by the first four bytes), plus `musicxml-encoding.spec.ts` covering each encoding with one real MusicXML header and a garbage case.
- [x] 2.2 Use it in `inspectSheetMusicBytes` for MusicXML and in `readMusicXmlText`; add a `reason` (`html-page`, `not-musicxml`, `unreadable-encoding`) to the invalid result. Extend `sheet-music-content.spec.ts` and `musicxml-text.spec.ts` (UTF-16 now valid, an HTML page reports `html-page`).
- [x] 2.3 Apply the 1.3 finding if a declaration rewrite is needed, with a spec for it. _Not needed: `DOMParser` ignores the declaration of a string (see design Decision 6); the UTF-16 specs in `sheet-music-content.spec.ts` and `musicxml-text.spec.ts` cover the decoded text._
- [x] 2.4 Map the `reason` to failure copy in `viewer/model.ts` (and the distinct `blocked` and `offline` wording from Decision 7), with `viewer/model.spec.ts` cases. Update the `unsupported` path in `sheet-music-loader.ts` to carry the reason, with `sheet-music-loader.spec.ts` cases.
- [ ] 2.5 Verify in the browser preview with a UTF-16 and a UTF-8 BOM MusicXML served from `public/` (remove the fixtures afterward).

## 3. Drive write scope

- [ ] 3.1 Add `DRIVE_WRITE_SCOPE` and `hasDriveWriteScope(scope)` to `@org/google-drive` (whitespace-split, accepts `drive.file` or `drive`), with specs for missing, single, combined, and empty scope strings.
- [ ] 3.2 Add `driveWriteScope` to runtime config (`defaults.ts`, `runtime-config-model.ts`, `app.config.ts`), and a spec that `app.config.ts` and `defaults.ts` carry the same values.
- [ ] 3.3 Pass both scopes to `Google.useAuthRequest` in `use-authorization.ts`, and expose `hasWriteAccess` from the hook (from the stored `scope`). Extend `authorization.spec.ts` for a restored session with and without the write scope.
- [ ] 3.4 Add the `Allow saving to Drive` step component and its model (states: needs-permission, declined, ready), with specs for each state.
- [ ] 3.5 Manual check (needs the user): sign out and in on web, confirm the consent screen lists the new permission, then confirm the stored `scope` and `tokeninfo` per `design.md`.

## 4. Upload and source swap

- [ ] 4.1 Add `uploadDriveFile` to `@org/google-drive` (multipart upload, parent folder, abort signal, typed failures: `needs-write-access`, `quota`, `folder-not-writable`, `offline`, `too-large`, `unavailable`), with specs using a fake `fetch` for success, a 403, a 404 parent, an abort, and a network error.
- [ ] 4.2 Add a folder-choosing mode to the Drive picker (folders only, `Save here`, remembered last folder, opens at the track's own Drive folder when it has one), with a model spec for the mode.
- [ ] 4.3 Add `replaceSourceLocationWithDrive` to `@org/audio-library-models`, with specs for keeping id, label, part selection, and added time, re-detecting format, an unknown id, and a source removed mid-upload.
- [ ] 4.4 Add a web file chooser (`<input type="file">`, `.web` file with a native stub that reports unsupported) returning bytes and name, validated with `inspectSheetMusicBytes`, over 25 MB refused. Spec the validation and size rules through the model.

## 5. The save flow

- [ ] 5.1 Build the `Save to Drive` sheet: step 1 `Open the link`, step 2 `Choose the downloaded file`, step 3 destination folder, progress with cancel. Drive the steps from a pure state model with a spec for each transition, including cancel, failure, and removal mid-upload.
- [ ] 5.2 Add `Save to Drive` to the blocked failure card and to the manager row menu for link sources, and `From this device` to `Add sheet music`; adding a Drive source from there uses the existing add path and source limit. Component specs for the card actions.
- [ ] 5.3 After a successful save, replace the source (4.3), close the sheet, and open the viewer on the Drive copy.
- [ ] 5.4 Verify in the browser preview with the user's Drive: a blocked link (for example the `example.org` fixture, or a real score site), a device file, a cancelled upload, and a session without the write scope. Note the result per scenario in `spec.md`'s scenarios.

## 6. PDF zoom

- [ ] 6.1 **Check what PDF zoom does today** on web with a real Drive PDF (the `Radio Video V5.0 Score and Parts` PDF is a good one): the − and + buttons (50% to 400%, `pdf-page-layout.ts`), whether the zoom value reads correctly, whether the page stays sharp at 300% and 400%, and whether scroll position is kept when zooming. Record what is missing or broken here and in `design.md` before changing anything; adjust 6.2 to match.
- [ ] 6.2 Add direct-manipulation zoom for PDFs on web: pinch on a touch screen, `Ctrl`/`Cmd` + wheel or trackpad pinch on desktop, and double-tap or double-click to toggle between fit-to-width and a readable zoom (about 200%). Keep the point under the fingers fixed while zooming, clamp to the existing range, and keep the toolbar value in step. Put the gesture-to-zoom math in a pure model (`pdf-zoom-gestures.ts`) with a spec for focal-point scroll offsets, clamping, and the double-tap toggle; keep DOM listeners thin and `.web` only.
- [ ] 6.3 Make sure repeated zoom steps do not queue a full re-render of every page: coalesce rapid changes so only the final zoom renders at full resolution (a CSS scale in the meantime), and release canvases for pages far from the viewport at high zoom. Verify memory and responsiveness on the 20-page Drive PDF at 400%.
- [ ] 6.4 Verify in the browser preview (touch emulation for pinch and double-tap, wheel with `Ctrl` for desktop) and confirm the page does not zoom the whole browser page instead of the PDF (`touch-action` and `preventDefault` on the wheel handler).

## 7. Documentation and wrap-up

- [ ] 7.1 Update the README's Google OAuth section with the new scope and the console steps (link to `design.md` rather than duplicating it) and `.env.example` comments if any mention scopes.
- [ ] 7.2 Update `docs/` or the track-sheet-music spec's notes if they describe the "blocked host" copy, then run `openspec validate save-blocked-sheet-music-links-to-drive`.
- [ ] 7.3 Run lint, test, typecheck, and build for `mobile-rehearsal-player`, `google-drive`, and `audio-library-models` through Nx, and `npm ci` is not needed (no dependency changes).
- [ ] 7.4 Add a follow-up entry to `native-playback-follow-ups` noting that native needs the document picker and the same scope flow, then archive this change after the user's go-ahead.
