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
The system SHALL delete a recording only when the user confirms, and SHALL remove its audio, metadata, overlay segment, and playlist references together, showing playlist entries as removed. Deleting a recording SHALL NOT delete copies of it already exported to Drive.

#### Scenario: Delete
- **WHEN** the user confirms deleting a recording
- **THEN** its audio and metadata are removed and the total used storage drops

#### Scenario: In a playlist
- **WHEN** a deleted recording was in a playlist
- **THEN** the playlist shows it as unavailable and playback skips it

#### Scenario: Drive copies stay
- **WHEN** a recording that was exported to Drive is deleted
- **THEN** the files on Drive are untouched

### Requirement: The overlay segment cache is purgeable and rebuilt on demand
The system SHALL cache, for fast and offline overlay playback, the stretch of the original track that a recording covers as an overlay segment, in a store separate from recordings and from track audio, held within an overlay cache size and removed least recently played first. A purged segment SHALL be rebuilt from the original on the next play. A whole-track recording SHALL use the normal track audio path instead of a segment.

#### Scenario: First overlay play
- **WHEN** the overlay of a loop recording plays for the first time
- **THEN** the loop's stretch of the original is stored as an overlay segment

#### Scenario: Budget exceeded
- **WHEN** overlay segments exceed the overlay cache size
- **THEN** the least recently played segment is removed first, and no recording is removed

#### Scenario: Purged segment
- **WHEN** a recording's overlay segment was purged and the original is available
- **THEN** the overlay plays after the segment is rebuilt from the original

#### Scenario: Whole-track recording
- **WHEN** a whole-track recording's overlay plays
- **THEN** it uses the track audio path and no segment is stored

### Requirement: A recording's overlay can be kept offline individually and in bulk
The system SHALL let the user keep a recording's overlay offline, or remove it from the offline store, one at a time from its row menu and the Library view and in bulk from a selection. A kept overlay segment SHALL be exempt from purging and SHALL play without a connection or Drive session. Removing it from the offline store SHALL return it to the purgeable cache and SHALL NOT delete the recording. Keeping a track offline SHALL NOT ask about its recordings, and SHALL make every recording of it overlay-capable offline.

#### Scenario: Keep one
- **WHEN** the user chooses `Keep overlay offline` on a loop recording
- **THEN** its segment is stored, shown as kept, and exempt from purging

#### Scenario: Offline overlay
- **WHEN** the device is offline and a recording's overlay was kept
- **THEN** the overlay plays without a connection

#### Scenario: Not kept and offline
- **WHEN** the device is offline and neither the segment nor the track is stored
- **THEN** the recording plays alone and a message says the overlay needs a connection

#### Scenario: Remove from offline
- **WHEN** the user chooses `Remove from offline`
- **THEN** the segment returns to the purgeable cache and the recording remains

#### Scenario: Keeping a track offline
- **WHEN** the user keeps a track with recordings offline
- **THEN** no question about recordings is asked, and its recordings can overlay offline

#### Scenario: Whole-track recording
- **WHEN** the user opens the menu of a whole-track recording
- **THEN** it says the overlay uses the track and offers to keep the track offline instead

### Requirement: The offline files view and Settings show recordings storage separately
The system SHALL list overlay segments in their own group in the offline files view with their state and size, SHALL list recordings in a separate group with their sizes and only a delete action, and SHALL provide the overlay cache size on the settings page that holds the offline cache size, with a default of 100 MB.

#### Scenario: Groups
- **WHEN** the user opens the offline files view
- **THEN** overlay segments show `Automatic` or `Kept offline`, recordings show their sizes, and recordings are not listed as cache

#### Scenario: Change the size
- **WHEN** the user sets the overlay cache size to 50 MB
- **THEN** automatic segments beyond it are removed least recently played first and recordings are untouched
