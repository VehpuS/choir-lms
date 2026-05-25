## Why

Choir members need a dependable mobile practice experience that turns existing rehearsal audio into reusable study sessions, instead of forcing them to hunt through shared folders and manually seek to the same passages over and over. Starting with a focused mobile rehearsal player creates a fast path to user value while establishing the media and domain foundations for a broader choir learning platform.

## What Changes

- Introduce a first product slice centered on a mobile rehearsal player backed by Google Drive audio files.
- Allow users to authenticate with Google Drive, browse and search accessible audio files across My Drive and shared folders, save selected tracks by reference into an app-owned rehearsal library, and play full tracks inside the app.
- Allow users to mark start and end positions on a saved track and save those ranges as named loops for direct playback.
- Allow users to add saved full tracks and saved loops into playlists that support ordered playback, repeat, and shuffle.
- Define a music-app-inspired mobile UI shell for discovery, search, personal library management, playlists, and playback queues so the app feels closer to a dedicated listening product than a utility workflow.
- Expose playback behavior through native mobile media integrations where practical for MVP, including lock-screen and background transport controls.
- Explicitly defer offline playback, rich collaboration, non-audio learning materials, recording overlays, and rehearsal-running workflows from this first slice.

## Capabilities

### New Capabilities

- `mobile-practice-library`: Browse and search accessible Google Drive audio, save source references into a personal rehearsal library, and use saved full tracks as playable rehearsal material.
- `practice-loops-and-playlists`: Create named loops from source audio, add tracks and loops to playlists, and control playback with repeat, shuffle, and native mobile transport integration.
- `mobile-rehearsal-player-ui`: Present discovery, search, library management, playlists, and now-playing flows through a rehearsal-first mobile UI modeled on strong consumer music app interaction patterns.

### Modified Capabilities

- None.

## Impact

- Adds the first application-facing product contract for this repository and establishes the initial domain around playable items, saved loops, and playlists.
- Requires Google authentication plus Drive browse and search access for audio metadata and streaming.
- Requires a mobile-oriented React client, audio playback infrastructure, and app-owned persistence for saved library references, loop definitions, and playlists.
- Requires a destination-based mobile navigation shell, persistent mini-player behavior, and queue-oriented playback UX so the product can support repeated listening sessions without feeling like a raw file browser.
- Constrains MVP scope to online audio playback only, reducing complexity from offline sync, document tooling, and advanced collaborative media workflows.
