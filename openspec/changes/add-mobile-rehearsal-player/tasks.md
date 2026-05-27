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
- [x] 4.1b Replace the persistent library loop builder with a track-launched loop creation surface that uses a dual-thumb range slider and focused save flow.
- [x] 4.2 Implement the destination-based mobile shell with Home, Search, Library, and a persistent mini-player anchored above bottom navigation around the already-working discovery and saved-library flows.
- [x] 4.3 Implement browse, search, and personal library screens that separate discovery from saved tracks and saved loops while preserving fast rehearsal actions for the current slice.
- [x] 4.4 Implement playlist creation and editing for saved full tracks and saved loops.
- [x] 4.5 Move playlist-building actions out of the in-playlist editor cards and into the saved track / saved loop library surfaces so Library drives playlist population while playlist detail stays focused on order and playback intent.
- [x] 4.5a Replace generic add-to-playlist affordances on saved track rows with a More Options context menu that opens a track metadata bottom sheet, then a playlist selector overlay for existing-playlist assignment or in-flow playlist creation.
- [x] 4.6 Wire playlist playback in the mobile app to the shared queue helpers so rehearsal sessions can start from saved playlists and honor ordered playback, shuffle, and repeat off / one / all across track and loop items.
- [x] 4.6a Persist playlist membership through ordered playlist-entry relationships so saved tracks and saved loops can belong to multiple playlists with independent explicit sort indexes and duplicate-safe queue positions.

## 5. Native playback integration and validation

- [x] 5.1 Replace the temporary mini-player summary and editor-first playlist flow with dedicated playlist detail, now-playing, and Up Next surfaces that surface active item order, repeat / shuffle state, and saved-loop context.
- [x] 5.1a Extend now-playing and playlist queue behavior with a draggable scrubber slider, an in-app volume slider, and duplicate-safe queue positions for repeated playlist items.
- [x] 5.1b Update playlist detail interactions to use a `PlayAll` FAB, row-tap playback from the tapped playlist index, row-local `removeFromPlaylist` with undo snackbar feedback, and a header-triggered edit mode that swaps playback icons for drag handles plus destructive controls.
- [ ] 5.1c Keep playlist context menus, selector overlays, toast / snackbar feedback, and playlist `EditState` in UI-local models so the playback engine rebuilds queues from persisted playlist-entry order instead of transient screen state.
- [ ] 5.1d Align the mini-player and dedicated playback screen with the waveform-first rehearsal UX by anchoring the mini-player above bottom navigation, replacing artwork with waveform treatments, adding playing-only marquee behavior, introducing a slide-up / swipe-down playback modal that always keeps rehearsal-oriented skip-back / skip-forward controls while conditionally exposing previous / next item controls only for playlist or queued playback, and placing repeat / shuffle session controls on the dedicated playback and queue surfaces instead of the playlist detail screen.
- [ ] 5.2 Extend the TrackPlayer integration so background playback plus supported native play / pause / next / previous controls operate on the active rehearsal queue instead of single-item playback.
- [ ] 5.3 Remove placeholder copy and redundant controls that still point to a later playback slice or duplicate nearby actions so each screen keeps one clear rehearsal job.
- [ ] 5.4 Validate ordered, shuffled, repeated, and loop-bounded playback on supported mobile platforms using representative Google Drive audio from both personal and shared Drive contexts.
- [ ] 5.5 Add automated coverage for shared queue construction / navigation and app-level playback view-model helpers, then add a manual regression checklist for the core MVP flows in the mobile-practice-library, practice-loops-and-playlists, and mobile-rehearsal-player-ui specs.
- [ ] 5.6 Compare the final Home, Search, Library, playlist detail, playback modal, and queue interactions against the mobile-rehearsal-player-ui mockups on representative phone-sized screens, including mini-player persistence, waveform-first playback treatments, loop selection, volume, and music-icon semantics, and record any intentional spec deltas before more feature work.
