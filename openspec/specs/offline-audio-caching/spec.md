# offline-audio-caching Specification

## Purpose

Downloaded Drive audio and sheet music reused instead of fetched again, bounded by a cache size, optionally kept offline, playable without a Drive session, and managed from a dedicated offline files view. Created by archiving change offline-audio-caching.

## Requirements

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

The system SHALL hold automatically cached audio within a size budget (the cache size) and evict the least recently used automatic entries first. A user SHALL be able to choose `Keep offline` for a file, which SHALL exempt it from automatic eviction until the user removes it. Kept files SHALL be stored separately from the cache size: they SHALL NOT count toward it, and a kept file larger than the cache size SHALL still be kept. The system SHALL show the automatic cache used against the cache size and the space used by kept files as a separate figure, and SHALL let the user clear the automatic cache or all offline files.

#### Scenario: Eviction skips kept files

- **WHEN** the cache is over budget and the oldest entry is kept offline
- **THEN** the oldest unkept entry is evicted instead

#### Scenario: Kept files do not use the cache size

- **WHEN** the cache size is 250 MB, 300 MB of files are kept offline, and 200 MB of other audio is cached automatically
- **THEN** nothing is evicted, and the storage view shows 200 MB of 250 MB for the automatic cache and 300 MB kept

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

The system SHALL provide an offline files view opened from the user-icon session menu. It SHALL list every offline audio and score file with its name, its size, and whether it is kept or automatic, SHALL show the automatic cache used against the cache size and the space used by kept files separately, and SHALL let the user remove one file, a selection of files, the automatic cache, or all offline files. Sizes SHALL be shown in human-readable units (KB, MB or GB) wherever they appear, and the list SHALL be sortable by size. Files SHALL be selectable directly, without first entering a selection mode.

#### Scenario: Browse and purge from the view

- **WHEN** the user opens the offline files view, selects two files and chooses `Remove from offline`
- **THEN** both files leave the list, the storage used decreases by their combined size, and they are no longer playable offline

#### Scenario: Sizes are clear

- **WHEN** a 3,400,000-byte file and a 812,000-byte file are cached
- **THEN** the rows read `3.2 MB` and `793 KB` and the automatic cache reads as used of the cache size, for example `4.0 MB of 500 MB`

#### Scenario: Nothing offline

- **WHEN** no file is stored
- **THEN** the view explains how to keep a file offline instead of showing an empty list

### Requirement: The user can set the offline cache size

The system SHALL let the user choose the size of the automatic audio cache from a set of preset sizes, from the offline files view and from Settings, and SHALL remember the choice on that device. Lowering the size SHALL immediately evict the least recently used files that are not kept offline until the cache fits. The cache size SHALL cover automatic files only: files kept offline SHALL NOT be evicted by a lower size and SHALL NOT count toward it.

#### Scenario: Lower the cache size

- **WHEN** the cache holds 400 MB of automatic files and the user chooses 250 MB
- **THEN** the least recently used automatic files are removed until 250 MB or less remains, and the offline files view shows the new total against 250 MB

#### Scenario: Kept files are unaffected by the chosen size

- **WHEN** kept files total 300 MB, 100 MB of automatic files are cached, and the user chooses 100 MB
- **THEN** no kept file is removed, the automatic files stay (they fit), and the view shows 100 MB of 100 MB for the cache and 300 MB kept

#### Scenario: The choice persists

- **WHEN** the user chooses 1 GB and restarts the app
- **THEN** the cache size is still 1 GB

### Requirement: Settings groups its options into pages

The system SHALL organize Settings so its options are reached without scrolling through every section: related options SHALL be grouped under named categories, and the offline storage options SHALL be one of them. Existing options SHALL keep their behavior and labels.

#### Scenario: Open a category

- **WHEN** the user opens Settings and chooses `Offline storage`
- **THEN** the cache size, storage used and the link to the offline files view are shown, and the other categories' options are not on the same screen

#### Scenario: Back to the categories

- **WHEN** the user is inside a category and goes back
- **THEN** the list of categories is shown again
