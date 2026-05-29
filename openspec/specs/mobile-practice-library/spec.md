# mobile-practice-library Specification

## Purpose
TBD - created by archiving change add-mobile-rehearsal-player. Update Purpose after archive.
## Requirements
### Requirement: Users can connect a Google Drive audio library

The system SHALL allow an authenticated user to connect a Google account and authorize access to Google Drive files required for the mobile rehearsal player.

#### Scenario: Successful Drive connection

- **WHEN** a user completes the supported Google sign-in and Drive authorization flow
- **THEN** the system makes that user's accessible Drive folders and audio files available to the Drive browser, search, and saved rehearsal library features

#### Scenario: Drive access is unavailable

- **WHEN** a user's Google Drive authorization is missing, expired, or revoked
- **THEN** the system prevents Drive browsing, search, and playback until access is re-established and communicates that the library connection requires attention

### Requirement: Users can browse and search Google Drive for supported audio files

The system SHALL allow a connected user to browse folders and search accessible Google Drive locations, including shared folders, to find candidate rehearsal audio files.

#### Scenario: Browse a Drive folder

- **WHEN** a connected user opens a Drive folder or shared location in the source browser
- **THEN** the system lists child folders and supported audio files they can access in that location with enough metadata to decide what to open or save

#### Scenario: Search accessible Drive content

- **WHEN** a connected user searches for a rehearsal track
- **THEN** the system returns matching accessible supported audio files from that user's Drive and shared folders with enough location metadata to understand where each result lives

#### Scenario: Unsupported files are excluded from playback choices

- **WHEN** a browsed or searched Google Drive location contains files that are not supported audio sources for the MVP
- **THEN** the system excludes those files from the playable results or clearly marks them as unavailable for playback

### Requirement: Users can save Google Drive tracks by reference in the rehearsal library

The system SHALL allow a connected user to save a supported Google Drive audio file by reference into an app-owned rehearsal library without copying the source media.

#### Scenario: Save a Drive track to the rehearsal library

- **WHEN** a user saves a supported Drive audio file from the browser or search results
- **THEN** the system adds a reference to that source in the user's rehearsal library for later playback, loop creation, and playlist use

#### Scenario: Saved source becomes unavailable

- **WHEN** a saved rehearsal library item no longer has an accessible Google Drive source
- **THEN** the system keeps the saved reference visible in the rehearsal library and marks it unavailable until access is restored or the user removes it

### Requirement: Users can play full tracks from the rehearsal library

The system SHALL allow a user to start playback of a full saved Google Drive audio track from the rehearsal library without requiring loop creation first.

#### Scenario: Play a full track from the library

- **WHEN** a user selects a saved playable audio file from the rehearsal library
- **THEN** the system starts playback of the full track as a playable item in the mobile rehearsal player

#### Scenario: Source track becomes unavailable at playback time

- **WHEN** a user attempts to play a library track whose Google Drive source can no longer be accessed
- **THEN** the system does not start playback and informs the user that the source file is unavailable

