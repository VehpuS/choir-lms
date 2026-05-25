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
- [ ] 4.4 Implement playlist creation and editing for saved full tracks and saved loops.
- [ ] 4.5 Implement rehearsal queue behavior for ordered playback, repeat, and shuffle across playlist items.

## 5. Native playback integration and validation

- [ ] 5.1 Implement playlist detail, now-playing, and queue surfaces that prioritize playback intent, item order, repeat and shuffle state, and loop context once playlist and queue behavior exist.
- [ ] 5.2 Integrate background playback and supported native transport controls with the active rehearsal queue.
- [ ] 5.3 Validate playback behavior on supported mobile platforms using representative Google Drive audio files and loop ranges.
- [ ] 5.4 Add automated and manual verification coverage for the core MVP scenarios defined in the mobile-practice-library, practice-loops-and-playlists, and mobile-rehearsal-player-ui specs.
- [ ] 5.5 Validate the new interaction model against the `mobile-rehearsal-player-ui` spec mockups on representative phone-sized screens before additional feature expansion.
