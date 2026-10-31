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

### Requirement: A take is recorded against the playing track and remembers which track positions it was sung against
The system SHALL record a take while a track plays and SHALL store a timeline mapping the take's audio to track positions, together with the latency compensation applied and the sample rate. The timeline SHALL follow pauses, seeks, and loop wraps during the take. Recording SHALL be allowed at any playback speed and pitch shift, and the take itself SHALL be recorded at its natural speed and pitch, unaffected by them.

#### Scenario: Take while the track plays
- **WHEN** the track plays and the user starts a take
- **THEN** the take is stored with a timeline whose first segment starts at the track position of the first captured sample, corrected for latency

#### Scenario: Sped-up or slowed track
- **WHEN** the track plays at 0.7× and the user records for ten seconds
- **THEN** the take is ten seconds long, and the take stores that it was recorded against a track at speed 0.7, so its ten seconds covered seven seconds of track

#### Scenario: Transposed track
- **WHEN** the track plays with a pitch shift
- **THEN** the take's audio is captured unshifted and the shift is stored only as information about what it was recorded against

#### Scenario: Shaping fixed for the take
- **WHEN** a take is recording
- **THEN** the speed and pitch controls are disabled with a note saying they are locked while recording, and the take keeps the speed and pitch that were in effect when it started

#### Scenario: Shaping set before starting
- **WHEN** the user sets a speed or pitch, or plays a saved adjusted track, and then starts a take
- **THEN** the take records against exactly that shaping and stores it

#### Scenario: Seek during a take
- **WHEN** the user seeks while recording
- **THEN** the timeline starts a new segment at the new track position

#### Scenario: Pause during a take
- **WHEN** the track is paused while recording continues
- **THEN** the timeline holds the track position for that stretch

#### Scenario: No track playing
- **WHEN** no track is loaded
- **THEN** starting a take is unavailable with an explanation

### Requirement: A take can be started and stopped by hand over any segment of the song
The system SHALL let the user start a take from any track position and stop it at any later moment, so that a take can cover any segment of the song, and SHALL NOT require a take to begin at the start of the track or to end at its end.

#### Scenario: Segment from the middle
- **WHEN** the user seeks to the middle of the track, starts a take, and stops it twenty seconds later
- **THEN** the stored take covers those twenty seconds of the song

#### Scenario: Stop before the end
- **WHEN** the user stops a take while the track continues to play
- **THEN** the take ends and the track keeps playing

### Requirement: A take made over a loop is a loop take
The system SHALL treat a take started while a loop is active as a loop take, SHALL store a reference to that loop and its range, and SHALL list the take under the loop as well as under the track. A loop take MAY span several passes of the loop.

#### Scenario: Recording over a loop
- **WHEN** a loop is active and the user records three passes
- **THEN** the take's timeline holds three segments over the loop's range and the take is listed under the loop

#### Scenario: Loop removed later
- **WHEN** the loop is deleted after the take was made
- **THEN** the take stays under the track and keeps its recorded range

### Requirement: Markers are shown as context while recording and in the takes list
The system SHALL show the previous and next marker names and positions beside the elapsed time while recording, and SHALL describe a take's span by marker names when its start and end fall near markers, and by times otherwise. Markers SHALL be optional context and SHALL NOT be needed to record.

#### Scenario: Near markers
- **WHEN** a take starts near the marker "Verse 2" and ends near "Chorus"
- **THEN** the takes list shows its span as "Verse 2 → Chorus"

#### Scenario: No markers
- **WHEN** the track has no markers
- **THEN** the span is shown as times and recording works as usual

#### Scenario: Marker context while recording
- **WHEN** a take is in progress
- **THEN** the strip shows the marker the track has just passed and the next one

### Requirement: A take can be armed to start and stop at a marker or loop
The system SHALL let the user arm a take to begin when playback reaches a chosen marker or the start of the active loop and to end at a chosen later marker or the end of the active loop, and manual start and stop SHALL remain available in every case.

#### Scenario: Armed from a marker
- **WHEN** the user arms a take from "Chorus" to "Bridge" and playback reaches "Chorus"
- **THEN** recording begins there and ends when playback reaches "Bridge"

#### Scenario: Armed over a loop
- **WHEN** a loop is active and the user arms a take to its ends
- **THEN** recording begins at the loop start and ends at the loop end of the same pass

#### Scenario: Stopping an armed take early
- **WHEN** an armed take is recording and the user presses stop
- **THEN** the take ends at once and is saved

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

### Requirement: A take is a self-contained entry that does not depend on later changes to its track
The system SHALL store with each take a snapshot of the original track (Drive file id, name, content version, duration, and whether it was an adjusted copy), the loop and the markers within the take's span as they were, and the shaping and punch range in effect while recording. The system SHALL show the take using that snapshot rather than the live library.

#### Scenario: Track renamed
- **WHEN** the track is renamed after the take was recorded
- **THEN** the take still shows the name it was recorded under

#### Scenario: Marker or loop changed
- **WHEN** a marker or loop used by the take is moved, renamed, or deleted
- **THEN** the take's span and loop description are unchanged

#### Scenario: Original replaced or removed
- **WHEN** the track's content version no longer matches the snapshot, or the track is gone
- **THEN** the take stays listed, is marked `Original track changed`, and its overlay plays against the kept copy of the original audio

### Requirement: The original audio is kept with the take as part of offline storage
The system SHALL keep the original track's audio, at the version the take was recorded against, as an offline entry that automatic eviction never removes and that is owned by the takes using it. It SHALL be on by default and optional per take, SHALL be shared by takes of the same track and version, SHALL adopt bytes already kept offline instead of copying them, SHALL be listed in the offline files view labelled as kept for takes, and SHALL be removed with the last take that uses it.

#### Scenario: Two takes of one version
- **WHEN** the user saves two takes against the same track version
- **THEN** one copy of the audio is stored and both takes own it

#### Scenario: Already kept offline
- **WHEN** the track is already kept offline at that version
- **THEN** no second copy is made and the take becomes an owner of the existing entry

#### Scenario: Last take deleted
- **WHEN** the last take that owns the entry is deleted
- **THEN** the kept audio is removed and the storage is freed

#### Scenario: Kept copy turned off
- **WHEN** the user saves a take with `Keep the original with this take` off
- **THEN** no copy is kept, and after the live track changes the take plays alone and exports only the bare recording
