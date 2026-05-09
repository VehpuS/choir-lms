## 1. Workspace and app foundation

- [ ] 1.1 Generate the Expo-based mobile application and shared workspace packages needed for domain, playback, and Google integration code.
- [ ] 1.2 Add and configure the MVP dependencies for Google authentication, Google Drive access, audio playback, native media controls, and app-owned persistence.
- [ ] 1.3 Establish environment configuration for Google credentials, supported audio formats, and mobile platform setup.

## 2. Domain and data modeling

- [ ] 2.1 Define the core domain models for Drive audio sources, playable items, named loops, playlists, and ownership scope.
- [ ] 2.2 Implement persistence for user-owned loops and playlists that references Google Drive audio without copying source media.
- [ ] 2.3 Implement services for Drive library metadata, authorization state, and unavailable-source handling.

## 3. Google Drive library and full-track playback

- [ ] 3.1 Implement the Google sign-in and Drive authorization flow for the mobile rehearsal player.
- [ ] 3.2 Build the mobile rehearsal library view for supported Google Drive audio files and unavailable or unsupported file states.
- [ ] 3.3 Implement full-track playback from the rehearsal library using the shared playable-item model.

## 4. Loop and playlist workflows

- [ ] 4.1 Implement loop marker selection, loop validation, and named loop creation from a source track.
- [ ] 4.2 Implement playlist creation and editing for both full tracks and saved loops.
- [ ] 4.3 Implement rehearsal queue behavior for ordered playback, repeat, and shuffle across playlist items.

## 5. Native playback integration and validation

- [ ] 5.1 Integrate background playback and supported native transport controls with the active rehearsal queue.
- [ ] 5.2 Validate playback behavior on supported mobile platforms using representative Google Drive audio files and loop ranges.
- [ ] 5.3 Add automated and manual verification coverage for the core MVP scenarios defined in the mobile-practice-library and practice-loops-and-playlists specs.
