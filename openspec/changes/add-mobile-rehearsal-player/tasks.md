## 1. Workspace and app foundation

- [x] 1.1 Generate the Expo-based mobile application and shared workspace packages needed for domain, playback, and Google integration code.
- [x] 1.2 Add and configure the MVP dependencies for Google authentication, Google Drive access, audio playback, native media controls, and app-owned persistence.
- [x] 1.3 Establish environment configuration for Google credentials, supported audio formats, and mobile platform setup.

## 2. Domain and data modeling

- [x] 2.1 Define the core domain models for Drive audio sources, playable items, named loops, playlists, and ownership scope.
- [x] 2.2 Implement persistence for user-owned loops and playlists that references Google Drive audio without copying source media.
- [x] 2.3 Implement services for Drive library metadata, authorization state, and unavailable-source handling.

## 3. Google Drive library and full-track playback

- [x] 3.1 Implement the Google sign-in and Drive authorization flow for the mobile rehearsal player.
- [x] 3.2 Implement Drive browsing and search across personal Google Drive and accessible shared folders, with supported and unavailable file states.
- [x] 3.3 Implement saving and removing Google Drive track references in the app-owned rehearsal library.
- [x] 3.4 Implement full-track playback from the saved rehearsal library using the shared playable-item model.

## 4. Loop workflows and early UI alignment

- [x] 4.1 Implement loop marker selection, loop validation, and named loop creation from a saved rehearsal library track.
- [x] 4.2 Implement the destination-based mobile shell with Home, Search, Library, and a persistent mini-player around the already-working discovery and saved-library flows.
- [x] 4.3 Implement browse, search, and personal library screens that separate discovery from saved tracks and saved loops while preserving fast rehearsal actions for the current slice.
- [x] 4.4 Implement playlist creation and editing for saved full tracks and saved loops.
- [x] 4.5 Move playlist-building actions out of the in-playlist editor cards and into the saved track / saved loop library surfaces so Library drives playlist population while playlist detail stays focused on order and playback intent.
- [ ] 4.6 Wire playlist playback in the mobile app to the shared queue helpers so rehearsal sessions can start from saved playlists and honor ordered playback, shuffle, and repeat off / one / all across track and loop items.

## 5. Native playback integration and validation

- [ ] 5.1 Replace the temporary mini-player summary and editor-first playlist flow with dedicated playlist detail, now-playing, and Up Next surfaces that surface active item order, repeat / shuffle state, and saved-loop context.
- [ ] 5.2 Extend the TrackPlayer integration so background playback plus supported native play / pause / next / previous controls operate on the active rehearsal queue instead of single-item playback.
- [ ] 5.3 Remove placeholder copy and redundant controls that still point to a later playback slice or duplicate nearby actions so each screen keeps one clear rehearsal job.
- [ ] 5.4 Validate ordered, shuffled, repeated, and loop-bounded playback on supported mobile platforms using representative Google Drive audio from both personal and shared Drive contexts.
- [ ] 5.5 Add automated coverage for shared queue construction / navigation and app-level playback view-model helpers, then add a manual regression checklist for the core MVP flows in the mobile-practice-library, practice-loops-and-playlists, and mobile-rehearsal-player-ui specs.
- [ ] 5.6 Compare the final Home, Search, Library, playlist detail, now-playing, and queue interactions against the mobile-rehearsal-player-ui mockups on representative phone-sized screens, and record any intentional spec deltas before more feature work.
