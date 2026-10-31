## ADDED Requirements

### Requirement: Recording is offered only where the platform can capture and store
The system SHALL list a `Recording` row in the `Practice tools` menu only on platforms that can capture microphone audio and store takes locally. Where it cannot, the row SHALL be absent, and the menu SHALL follow its existing rule of disappearing when no tool is available.

#### Scenario: Web browser with capture and storage
- **WHEN** the app runs in a browser that can open the microphone and use IndexedDB
- **THEN** the `Practice tools` menu includes a `Recording` row

#### Scenario: Native platform
- **WHEN** the app runs on iOS or Android
- **THEN** the `Recording` row is absent

### Requirement: Recording starts only on an explicit action and explains storage first
The system SHALL start capturing only when the user starts a take. The first time, it SHALL show a note that audio is recorded and kept on this device under the track until deleted, and that headphones are assumed, and it SHALL NOT request the microphone until the user continues. This explanation SHALL be separate from the pitch detection explanation.

#### Scenario: First take
- **WHEN** the user starts a take for the first time
- **THEN** the note is shown and the microphone is requested only after the user continues

#### Scenario: Later takes
- **WHEN** the user has already continued past the note
- **THEN** starting a take captures immediately, subject to the browser permission

#### Scenario: Microphone blocked
- **WHEN** the browser denies or cannot provide the microphone
- **THEN** the system shows the reason in words with the way to fix it and records nothing

### Requirement: A visible indicator is shown while recording
The system SHALL show a recording state with elapsed time and a stop control for as long as audio is being captured.

#### Scenario: Recording in progress
- **WHEN** a take is being captured
- **THEN** the strip shows that it is recording, the elapsed time, and a stop control

### Requirement: A take is recorded against the playing track and remembers where it started
The system SHALL record a take while a track plays and SHALL store the track position of the take's first sample, the latency compensation applied, and the sample rate. Recording SHALL be available only at normal speed with no pitch shift, and otherwise the control SHALL say why it is unavailable.

#### Scenario: Take while the track plays
- **WHEN** the track plays at normal speed and the user starts a take
- **THEN** the take is stored with the track position at which its first sample was captured, corrected for latency

#### Scenario: Shaped playback
- **WHEN** playback speed is not 1× or a pitch shift is set
- **THEN** starting a take is unavailable with an explanation

#### Scenario: No track playing
- **WHEN** no track is playing
- **THEN** starting a take is unavailable with an explanation

### Requirement: Takes are stored on the device under their track, apart from the audio cache
The system SHALL store each take as lossless 16-bit mono audio in a store separate from the offline audio cache, owned by the track using the same owner resolution as markers and lyrics. Automatic cache eviction SHALL never remove a take, and the cache budget SHALL NOT count takes.

#### Scenario: Take kept after cache eviction
- **WHEN** the offline audio cache evicts tracks to stay within its budget
- **THEN** every stored take remains

#### Scenario: Take follows the track
- **WHEN** the same track is played from a playlist or as an adjusted copy
- **THEN** the same takes are listed

### Requirement: Takes can be listed, played alone, renamed, and deleted
The system SHALL list a track's takes with name, date, length, and size; play a take on its own; rename it; and delete it, freeing its storage at once. New takes SHALL be named `Take 1`, `Take 2`, and so on.

#### Scenario: Listing
- **WHEN** the user opens the takes list for a track
- **THEN** each take shows name, date, length, and size

#### Scenario: Delete
- **WHEN** the user deletes a take and confirms
- **THEN** the take and its audio are removed and the total used storage drops

### Requirement: A take stops safely and keeps what was captured
The system SHALL stop a take, keep the audio captured so far, and show the reason when the user stops it, the app is hidden, the microphone is interrupted or ends, the track ends, storage fails, or the take reaches ten minutes. A take shorter than one second SHALL be discarded with a note.

#### Scenario: App hidden
- **WHEN** the app becomes hidden during a take
- **THEN** the take stops, is saved, and the reason is shown when the app returns

#### Scenario: Storage failure
- **WHEN** writing the take fails
- **THEN** the system says the take could not be saved and why, and does not report success

#### Scenario: Very short take
- **WHEN** the user stops a take after less than one second
- **THEN** nothing is stored and a note says the take was too short

### Requirement: Pitch detection still stores no audio
The system SHALL keep the pitch detection pipeline free of any audio persistence, and only the recording code SHALL write audio samples to storage.

#### Scenario: Pitch detection alone
- **WHEN** pitch detection runs without a take in progress
- **THEN** no audio samples are written to storage or sent over the network

#### Scenario: Both tools on
- **WHEN** pitch detection and a take run together
- **THEN** one microphone stream serves both and only the take's audio is stored
