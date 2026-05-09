## Why

Choir members need a dependable mobile practice experience that turns existing rehearsal audio into reusable study sessions, instead of forcing them to hunt through shared folders and manually seek to the same passages over and over. Starting with a focused mobile rehearsal player creates a fast path to user value while establishing the media and domain foundations for a broader choir learning platform.

## What Changes

- Introduce a first product slice centered on a mobile rehearsal player backed by Google Drive audio files.
- Allow users to authenticate with Google Drive, browse accessible audio files, and play full tracks inside the app.
- Allow users to mark start and end positions on a track and save those ranges as named loops for direct playback.
- Allow users to add full tracks and saved loops into playlists that support ordered playback, repeat, and shuffle.
- Expose playback behavior through native mobile media integrations where practical for MVP, including lock-screen and background transport controls.
- Explicitly defer offline playback, rich collaboration, non-audio learning materials, recording overlays, and rehearsal-running workflows from this first slice.

## Capabilities

### New Capabilities

- `mobile-practice-library`: Access Google Drive audio files in a mobile-first rehearsal player and use full tracks as playable rehearsal material.
- `practice-loops-and-playlists`: Create named loops from source audio, add tracks and loops to playlists, and control playback with repeat, shuffle, and native mobile transport integration.

### Modified Capabilities

- None.

## Impact

- Adds the first application-facing product contract for this repository and establishes the initial domain around playable items, saved loops, and playlists.
- Requires Google authentication and Drive file access for audio metadata and streaming.
- Requires a mobile-oriented React client, audio playback infrastructure, and app-owned persistence for loop and playlist definitions.
- Constrains MVP scope to online audio playback only, reducing complexity from offline sync, document tooling, and advanced collaborative media workflows.
