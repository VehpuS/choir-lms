## ADDED Requirements

### Requirement: Downloaded audio is reused instead of fetched again

The system SHALL keep each downloaded Drive audio file, keyed by Drive file id and content version (`modifiedTime`), so that playing the same file again does not download it again. Concurrent requests for one file and version SHALL share a single download, and cancelling one request SHALL NOT cancel a download another request still needs. Stopping or resetting playback SHALL release the player's hold without discarding the cached bytes.

#### Scenario: Replaying a file does not download it again

- **WHEN** a file has played and the user previews a new loop range of the same file
- **THEN** playback starts from the cached bytes and no new Drive media request is made

#### Scenario: Two requests share one download

- **WHEN** a track start and a waveform analysis ask for the same uncached file at once
- **THEN** one Drive media request is made and both receive the bytes

#### Scenario: A superseded request leaves a needed download running

- **WHEN** playback of file A is superseded while a waveform analysis still waits on A's download
- **THEN** the download completes and the analysis receives it

#### Scenario: A changed file is fetched again

- **WHEN** Drive reports a different `modifiedTime` than the cached entry's
- **THEN** the stale entry is dropped and the file is downloaded again

### Requirement: Cached audio is bounded and can be kept offline

The system SHALL hold automatically cached audio within a size budget and evict the least recently used entries first. A user SHALL be able to choose `Keep offline` for a file, which SHALL exempt it from automatic eviction until the user removes it. The system SHALL show the storage used against the budget and SHALL let the user clear the automatic cache or all offline files.

#### Scenario: Eviction skips kept files

- **WHEN** the cache is over budget and the oldest entry is kept offline
- **THEN** the oldest unkept entry is evicted instead

#### Scenario: Kept files exceed the budget

- **WHEN** kept files alone exceed the budget
- **THEN** none of them is evicted and the storage view says the budget is exceeded

### Requirement: Cached audio plays without a Drive session

The system SHALL play cached tracks, loops and adjusted items without a network connection or Drive session, and SHALL show whether each file is available offline.

#### Scenario: Play offline

- **WHEN** the device is offline and the user plays a kept track
- **THEN** it plays and its row shows it is available offline

#### Scenario: Uncached file offline

- **WHEN** the device is offline and the user plays a file that is not cached
- **THEN** the app says the file needs a connection and does not show a playback error

### Requirement: Signing out asks what to do with offline copies

The system SHALL, when the user signs out of Drive and offline files exist, ask whether to keep or clear them. Choosing to clear SHALL remove all cached audio and score files.

#### Scenario: Clear on sign-out

- **WHEN** the user signs out and chooses to clear offline files
- **THEN** no cached audio or score file remains and the storage view shows zero used

### Requirement: Sheet music follows the track's offline state

The system SHALL keep the opened score files (Drive PDF, MusicXML, MIDI) of a track offline when the track is kept offline, and SHALL show an offline state in the sheet music source switcher. Linked pages SHALL be shown as needing a connection.

#### Scenario: Open a kept track's score offline

- **WHEN** the device is offline and the user opens the PDF of a kept track
- **THEN** the PDF renders from the stored copy

#### Scenario: Linked page offline

- **WHEN** the device is offline and the user opens a linked MuseScore page
- **THEN** the switcher marks it as needing a connection

### Requirement: A dedicated view lists offline files with their sizes

The system SHALL provide an offline files view opened from the user-icon session menu. It SHALL list every offline audio and score file with its name, its size, and whether it is kept or automatic, SHALL show total storage used against the budget, and SHALL let the user remove one file, a selection of files, the automatic cache, or all offline files. Sizes SHALL be shown in human-readable units (KB, MB or GB) wherever they appear, and the list SHALL be sortable by size.

#### Scenario: Browse and purge from the view

- **WHEN** the user opens the offline files view, selects two files and chooses `Remove from offline`
- **THEN** both files leave the list, the total used decreases by their combined size, and they are no longer playable offline

#### Scenario: Sizes are clear

- **WHEN** a 3,400,000-byte file and a 812,000-byte file are cached
- **THEN** the rows read `3.2 MB` and `793 KB` and the total reads as used of the budget, for example `4.0 MB of 500 MB`

#### Scenario: Nothing offline

- **WHEN** no file is stored
- **THEN** the view explains how to keep a file offline instead of showing an empty list
