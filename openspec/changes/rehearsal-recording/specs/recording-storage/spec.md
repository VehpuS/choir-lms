## ADDED Requirements

### Requirement: Recordings are stored locally in an automatic tier and a kept tier
The system SHALL store each recording's audio on the device in its own store, separate from the track audio store, as lossless 16-bit mono audio. New recordings SHALL start in an automatic tier counted against a recordings cache size and removed least recently played first when it is exceeded. A recording the user keeps offline SHALL be exempt from automatic removal and SHALL NOT count toward the recordings cache size. A recording that is open or playing SHALL NOT be removed automatically.

#### Scenario: Stored on stop
- **WHEN** a recording stops
- **THEN** its audio and metadata are written together and it is listed in the automatic tier

#### Scenario: Budget exceeded
- **WHEN** automatic recordings exceed the recordings cache size
- **THEN** the least recently played automatic recording is removed first, and kept recordings are not touched

#### Scenario: Playing recording protected
- **WHEN** the oldest automatic recording is open
- **THEN** the next oldest is removed instead

#### Scenario: Track cache unaffected
- **WHEN** recordings are added or removed
- **THEN** the track audio cache and its budget are unchanged

### Requirement: The risk of automatic removal is visible
The system SHALL label every automatic recording `Not kept offline` with a one-tap `Keep offline`, SHALL say so on the save sheet, and SHALL tell the user which recordings are about to be removed the first time automatic removal would delete any, offering to keep them. Removing a recording from the store SHALL delete its audio and its metadata together.

#### Scenario: Save sheet
- **WHEN** a recording is saved
- **THEN** the sheet says it is on this device and may be removed to free space unless kept or exported, and offers `Keep offline` and `Export`

#### Scenario: First removal
- **WHEN** automatic removal would delete a recording for the first time
- **THEN** the user is shown the recordings and offered `Keep them` or `Let them go`

### Requirement: Individual recordings can be kept offline or removed from the offline store
The system SHALL let the user keep a recording offline, or remove it from the offline store, one at a time from its row menu, the Recordings panel, and the Library view, and in bulk from a selection. Removing a recording from the offline store SHALL return it to the automatic tier and SHALL NOT delete it.

#### Scenario: Keep one
- **WHEN** the user chooses `Keep offline` on a recording
- **THEN** it shows as kept and is exempt from automatic removal

#### Scenario: Remove from offline
- **WHEN** the user chooses `Remove from offline` on a kept recording
- **THEN** it returns to the automatic tier and remains listed

### Requirement: Keeping a track offline never keeps its recordings without asking
The system SHALL NOT keep a track's recordings when the track is kept offline. When the user keeps a track (or several tracks) offline and it has recordings, the system SHALL ask whether to keep them too, offering `Keep all`, `Choose…` (a switch per recording), and `Not now`, and a `Remember my choice` option. The remembered choice SHALL be a setting with the values `Ask`, `Always keep them`, and `Never keep them`, SHALL apply to bulk actions, and SHALL be changeable on the same settings page as the offline cache size.

#### Scenario: Prompt for one track
- **WHEN** the user keeps a track with three recordings offline and the setting is `Ask`
- **THEN** the prompt names the three recordings and their total size

#### Scenario: Choose recordings
- **WHEN** the user chooses `Choose…` and switches on two of three recordings
- **THEN** only those two are kept offline

#### Scenario: Remember the choice
- **WHEN** the user chooses `Keep all` with `Remember my choice`
- **THEN** the setting becomes `Always keep them` and later keeps ask nothing

#### Scenario: Never
- **WHEN** the setting is `Never keep them`
- **THEN** keeping a track offline keeps no recordings and shows no prompt

#### Scenario: Bulk
- **WHEN** the user keeps five tracks offline and they have seven recordings in total
- **THEN** one prompt covers all seven, with the per-track counts

#### Scenario: Removing a track from offline
- **WHEN** the user removes a track from offline
- **THEN** its recordings are unchanged

#### Scenario: Keeping a recording does not keep its track
- **WHEN** the user keeps a recording offline
- **THEN** its track's offline state is unchanged and the row says the overlay needs the track when it is not stored

### Requirement: The offline files view lists recordings and their sizes
The system SHALL list recordings in their own group in the offline files view with their tier and size, show the recordings total and the recordings cache size, and let the user keep, remove from offline, or delete them there.

#### Scenario: Recordings group
- **WHEN** the user opens the offline files view
- **THEN** recordings appear in their own group with `Kept` or `Automatic` and their sizes, apart from track audio

### Requirement: The recordings cache size is a setting
The system SHALL let the user set the recordings cache size on the settings page that holds the offline cache size, with a default of 200 MB.

#### Scenario: Change the size
- **WHEN** the user sets the recordings cache size to 100 MB
- **THEN** automatic recordings beyond it are removed least recently played first, after the first-removal notice

### Requirement: Deleting a recording is explicit and removes everything it owns
The system SHALL delete a recording only when the user confirms, and SHALL remove its audio, metadata, and playlist references together, showing playlist entries as removed.

#### Scenario: Delete
- **WHEN** the user confirms deleting a recording
- **THEN** its audio and metadata are removed and the total used storage drops

#### Scenario: In a playlist
- **WHEN** a deleted recording was in a playlist
- **THEN** the playlist shows it as unavailable and playback skips it
