## ADDED Requirements

### Requirement: Users can connect a Google Drive audio library

The system SHALL allow an authenticated user to connect a Google account and authorize access to Google Drive files required for the mobile rehearsal player.

#### Scenario: Successful Drive connection

- **WHEN** a user completes the supported Google sign-in and Drive authorization flow
- **THEN** the system makes that user's accessible audio files available in the mobile rehearsal library

#### Scenario: Drive access is unavailable

- **WHEN** a user's Google Drive authorization is missing, expired, or revoked
- **THEN** the system prevents library playback until access is re-established and communicates that the library connection requires attention

### Requirement: Users can browse supported audio files from Google Drive

The system SHALL present supported Google Drive audio files as playable rehearsal sources in a mobile-first library view.

#### Scenario: Library shows playable files

- **WHEN** a connected user opens the rehearsal library
- **THEN** the system lists supported audio files the user can access from Google Drive with enough metadata to choose a track for playback

#### Scenario: Unsupported files are excluded from playback choices

- **WHEN** a connected Google Drive folder contains files that are not supported audio sources for the MVP
- **THEN** the system excludes those files from the playable library or clearly marks them as unavailable for playback

### Requirement: Users can play full tracks from the rehearsal library

The system SHALL allow a user to start playback of a full Google Drive audio track from the rehearsal library without requiring loop creation first.

#### Scenario: Play a full track from the library

- **WHEN** a user selects a playable audio file from the rehearsal library
- **THEN** the system starts playback of the full track as a playable item in the mobile rehearsal player

#### Scenario: Source track becomes unavailable at playback time

- **WHEN** a user attempts to play a library track whose Google Drive source can no longer be accessed
- **THEN** the system does not start playback and informs the user that the source file is unavailable
