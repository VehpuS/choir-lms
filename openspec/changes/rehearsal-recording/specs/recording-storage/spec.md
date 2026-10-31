## ADDED Requirements

### Requirement: Recordings are stored in dedicated storage that is never purged automatically
The system SHALL store each recording's raw audio and metadata on the device in storage separate from the track audio store, as lossless 16-bit mono audio, and SHALL NOT remove a recording except when the user deletes it. Clearing caches, evicting offline audio, forgetting a Drive session, and signing out SHALL NOT remove recordings.

#### Scenario: Stored on stop
- **WHEN** a recording stops
- **THEN** its audio and metadata are written together and it is listed

#### Scenario: Cache cleared
- **WHEN** the user clears the audio cache or the cache evicts tracks to stay within its size
- **THEN** every recording remains

#### Scenario: Signing out
- **WHEN** the user signs out of Drive and chooses what to do with offline copies
- **THEN** recordings are not part of that choice and remain

#### Scenario: Track cache unaffected
- **WHEN** recordings are added or deleted
- **THEN** the track audio cache and its size are unchanged

### Requirement: Storage use is visible and failures keep what was captured
The system SHALL show the total space recordings use in Settings and the offline files view, SHALL request persistent storage when the first recording is saved, and SHALL, when a write fails, keep what was captured, say why, and offer to export it.

#### Scenario: Total shown
- **WHEN** the user opens the recordings settings
- **THEN** the total used by recordings is shown with the line that recordings are never removed automatically

#### Scenario: Out of space
- **WHEN** saving a recording fails because storage is full
- **THEN** the system says so, does not report success, and offers `Export` of the captured audio before it is lost

### Requirement: Deleting a recording is explicit and removes everything it owns
The system SHALL delete a recording only when the user confirms, and SHALL remove its audio, metadata, and playlist references together, showing playlist entries as removed. Deleting a recording SHALL NOT delete copies of it already exported to Drive.

#### Scenario: Delete
- **WHEN** the user confirms deleting a recording
- **THEN** its audio and metadata are removed and the total used storage drops

#### Scenario: In a playlist
- **WHEN** a deleted recording was in a playlist
- **THEN** the playlist shows it as unavailable and playback skips it

#### Scenario: Drive copies stay
- **WHEN** a recording that was exported to Drive is deleted
- **THEN** the files on Drive are untouched

### Requirement: A recording's overlay depends on its track being available, and the track can be kept offline from the recording
The system SHALL play a recording's overlay from the normal track audio (playback cache, offline store, or Drive), SHALL NOT keep a copy of the track for the recording, and SHALL offer `Keep track offline` and `Remove track from offline` on a recording's row menu and for a selection, applying the existing track actions and saying they apply to the whole track and all its recordings. Keeping a track offline SHALL NOT ask about its recordings.

#### Scenario: Keep the track offline from a recording
- **WHEN** the user chooses `Keep track offline` on a recording
- **THEN** its track is kept offline as if kept from the library, the row says it applies to the whole track, and the overlay works without a connection

#### Scenario: Offline overlay
- **WHEN** the device is offline and the recording's track is stored
- **THEN** the overlay plays without a connection

#### Scenario: Track not stored
- **WHEN** the device is offline and the recording's track is neither cached nor kept
- **THEN** the recording plays alone and a message says the overlay needs a connection

#### Scenario: Bulk
- **WHEN** the user selects three recordings of two tracks and chooses `Keep track offline`
- **THEN** the two tracks are kept offline

#### Scenario: Remove from offline
- **WHEN** the user chooses `Remove track from offline` on a recording
- **THEN** the track returns to the cache as it would from the library and the recordings remain

#### Scenario: Keeping a track offline
- **WHEN** the user keeps a track with recordings offline from the library
- **THEN** no question about recordings is asked

### Requirement: The offline files view and Settings show recordings storage separately
The system SHALL list recordings in their own group in the offline files view with their sizes and only a delete action, never as cache, and SHALL show the total used by recordings in Settings with the line that recordings are never removed automatically. There SHALL be no size limit or cache setting for recordings.

#### Scenario: Recordings group
- **WHEN** the user opens the offline files view
- **THEN** recordings appear in their own group with their sizes and a delete action, apart from track audio

#### Scenario: No size setting
- **WHEN** the user opens the recordings settings
- **THEN** the total used is shown and no cache size is offered for recordings
