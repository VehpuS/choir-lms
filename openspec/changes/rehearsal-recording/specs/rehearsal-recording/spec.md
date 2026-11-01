## ADDED Requirements

### Requirement: Recording is offered only where the platform can capture and store
The system SHALL list a `Recording` row in the `Practice tools` menu only on platforms that can capture microphone audio and store recordings locally. Where it cannot, the row SHALL be absent, and the menu SHALL follow its existing rule of disappearing when no tool is available. The row SHALL control only the recording strip and the start and arm controls; viewing recordings SHALL NOT depend on it.

#### Scenario: Web browser with capture and storage
- **WHEN** the app runs in a browser that can open the microphone and use IndexedDB
- **THEN** the `Practice tools` menu includes a `Recording` row

#### Scenario: Native platform
- **WHEN** the app runs on iOS or Android
- **THEN** the `Recording` row is absent

### Requirement: Recording starts only on an explicit action and explains storage first
The system SHALL start capturing only when the user starts a recording. The first time, it SHALL show a note that audio is recorded and kept on this device under the track until you delete it (never removed automatically), that it can be exported or auto-exported to Drive, and that headphones are assumed, and it SHALL NOT request the microphone until the user continues. This explanation SHALL be separate from the pitch detection explanation.

#### Scenario: First recording
- **WHEN** the user starts a recording for the first time
- **THEN** the note is shown and the microphone is requested only after the user continues

#### Scenario: Later recordings
- **WHEN** the user has already continued past the note
- **THEN** starting a recording captures immediately, subject to the browser permission

#### Scenario: Microphone blocked
- **WHEN** the browser denies or cannot provide the microphone
- **THEN** the system shows the reason in words with the way to fix it and records nothing

### Requirement: A visible indicator is shown while recording
The system SHALL show a recording state with elapsed time, the previous and next marker, and a stop control for as long as audio is being captured.

#### Scenario: Recording in progress
- **WHEN** a recording is being captured
- **THEN** the strip shows that it is recording, the elapsed time, the marker just passed and the next one, and a stop control

### Requirement: A recording is made against the playing track and remembers which track positions it was sung against
The system SHALL record while a track plays and SHALL store a timeline mapping the recording's audio to track positions, together with the latency compensation applied and the sample rate. The timeline SHALL follow pauses, seeks, and loop wraps during the recording. Recording SHALL be allowed at any playback speed and pitch shift, and the recording itself SHALL be captured at its natural speed and pitch, unaffected by them.

#### Scenario: Recording while the track plays
- **WHEN** the track plays and the user starts a recording
- **THEN** the recording is stored with a timeline whose first segment starts at the track position of the first captured sample, corrected for latency

#### Scenario: Sped-up or slowed track
- **WHEN** the track plays at 0.7× and the user records for ten seconds
- **THEN** the recording is ten seconds long, and it stores that it was recorded against a track at speed 0.7, so its ten seconds covered seven seconds of track

#### Scenario: Transposed track
- **WHEN** the track plays with a pitch shift
- **THEN** the recording's audio is captured unshifted and the shift is stored as information about what it was recorded against

#### Scenario: Shaping fixed for the recording
- **WHEN** a recording is in progress
- **THEN** the speed and pitch controls are disabled with a note saying they are locked while recording, and the recording keeps the speed and pitch that were in effect when it started

#### Scenario: Shaping set before starting
- **WHEN** the user sets a speed or pitch, or plays a saved adjusted track, and then starts a recording
- **THEN** it records against exactly that shaping and stores it

#### Scenario: Seek during a recording
- **WHEN** the user seeks while recording
- **THEN** the timeline starts a new segment at the new track position

#### Scenario: Pause during a recording
- **WHEN** the track is paused while recording continues
- **THEN** the timeline holds the track position for that stretch

#### Scenario: No track playing
- **WHEN** no track is loaded
- **THEN** starting a recording is unavailable with an explanation

### Requirement: A recording can be started and stopped by hand over any segment of the song
The system SHALL let the user start a recording from any track position and stop it at any later moment, so that a recording can cover any segment of the song, and SHALL NOT require a recording to begin at the start of the track or to end at its end.

#### Scenario: Segment from the middle
- **WHEN** the user seeks to the middle of the track, starts a recording, and stops it twenty seconds later
- **THEN** the stored recording covers those twenty seconds of the song

#### Scenario: Stop before the end
- **WHEN** the user stops a recording while the track continues to play
- **THEN** the recording ends and the track keeps playing

### Requirement: A recording made over a loop belongs to the loop
The system SHALL treat a recording started while a loop is active as a loop recording owned by that loop (a loop of a track or of an adjusted track), and SHALL store the loop's name and range with it. A loop recording MAY span several passes of the loop.

#### Scenario: Recording over a loop
- **WHEN** a loop is active and the user records three passes
- **THEN** the recording's timeline holds three segments over the loop's range and the loop owns the recording

#### Scenario: Loop removed later
- **WHEN** the loop is deleted after the recording was made
- **THEN** the recording stays listed under its track with the loop name and range it recorded

### Requirement: Markers are shown as context while recording and in lists
The system SHALL show the previous and next marker names and positions beside the elapsed time while recording, and SHALL describe a recording's span by marker names when its start and end fall near markers, and by times otherwise. Markers SHALL be optional context and SHALL NOT be needed to record.

#### Scenario: Near markers
- **WHEN** a recording starts near the marker "Verse 2" and ends near "Chorus"
- **THEN** lists show its span as "Verse 2 → Chorus"

#### Scenario: No markers
- **WHEN** the track has no markers
- **THEN** the span is shown as times and recording works as usual

### Requirement: A recording stops safely and keeps what was captured
The system SHALL stop a recording, keep the audio captured so far, and show the reason when the user stops it, the app is hidden, the microphone is interrupted or ends, the track ends, storage fails or runs out, an armed punch range reaches its out point, or the recording reaches the 4 GiB limit of the audio format. A recording shorter than one second SHALL be discarded with a note.

#### Scenario: App hidden
- **WHEN** the app becomes hidden during a recording
- **THEN** the recording stops, is saved, and the reason is shown when the app returns

#### Scenario: Storage failure
- **WHEN** writing the recording fails
- **THEN** the system says the recording could not be saved and why, and does not report success

#### Scenario: Storage fills up
- **WHEN** the storage available to recordings runs out during a recording
- **THEN** the recording stops, everything written so far is kept, and the reason `Storage is full` is shown

#### Scenario: Very short recording
- **WHEN** the user stops a recording after less than one second
- **THEN** nothing is stored and a note says the recording was too short

### Requirement: Recording time left is shown from the available storage
The system SHALL limit a recording by the storage the browser makes available, not by a fixed length. Before and during a recording the system SHALL show the approximate recording time left, SHALL warn when little is left, and SHALL refuse to start with an explanation when less than a minute is left. Where the browser cannot report available storage, the system SHALL show no time left and SHALL stop only when a write fails.

#### Scenario: Time left before recording
- **WHEN** the recording strip is ready to record
- **THEN** it shows about how much recording time the free storage allows

#### Scenario: Counting down
- **WHEN** a recording is in progress
- **THEN** the time left counts down and is re-read from the browser as chunks are written

#### Scenario: Warning
- **WHEN** less than five minutes of recording time is left
- **THEN** the readout changes to a warning

#### Scenario: Not enough space to start
- **WHEN** less than a minute of recording time is left and the user starts a recording
- **THEN** nothing is recorded and a message explains that storage is low and points to the Recordings settings where recordings can be exported or deleted

#### Scenario: No estimate available
- **WHEN** the browser cannot report available storage
- **THEN** no time left is shown and the recording runs until a write fails

#### Scenario: Long recording
- **WHEN** a recording runs for an hour with enough storage
- **THEN** it is not stopped by its length

### Requirement: Pitch detection still stores no audio
The system SHALL keep the pitch detection pipeline free of any audio persistence, and only the recording code SHALL write audio samples to storage.

#### Scenario: Pitch detection alone
- **WHEN** pitch detection runs without a recording in progress
- **THEN** no audio samples are written to storage or sent over the network

#### Scenario: Both tools on
- **WHEN** pitch detection and a recording run together
- **THEN** one microphone stream serves both and only the recording's audio is stored

### Requirement: A recording stores the metadata needed to rebuild its overlay and mix
The system SHALL store with each recording the original track audio it was recorded against (Drive file id, name, content version, duration), its owner chain (the parent track, the saved adjusted copy with its adjustment values, and the loop with its range), its shaping, its balance, an engine version tag, the markers within its span, the punch range if any, and its timeline, so that a mix can be rebuilt from this metadata, the bare recording, and the original track audio alone. The system SHALL describe the recording from this metadata rather than from the live library, and SHALL NOT keep a copy of the original track audio.

#### Scenario: Track renamed
- **WHEN** the track is renamed after the recording was made
- **THEN** the recording still shows the name it was recorded under

#### Scenario: Marker or loop changed
- **WHEN** a marker or loop used by the recording is moved, renamed, or deleted
- **THEN** the recording's span and loop description are unchanged

#### Scenario: Adjusted copy deleted
- **WHEN** the saved adjusted track a recording was made on is deleted
- **THEN** the recording keeps the adjustment values it was made with and still opens against the parent track with them applied

#### Scenario: No copy of the original
- **WHEN** a recording is saved
- **THEN** no copy of the track audio is stored for it

### Requirement: A recording can be armed with a punch range set up on the waveform
The system SHALL let the user set an in point and an out point for a recording by dragging handles on the waveform, tapping marker flags, choosing markers from a list, typing a time, or using the active loop or the playhead, and SHALL show the nearest marker names and the resulting length. It SHALL offer a pre-roll of 0 to 10 seconds before the in point. Arming SHALL show the range on the waveform; playing from the pre-roll SHALL start recording at the in point and stop it at the out point, and manual start, stop, and disarm SHALL remain available at all times.

#### Scenario: Set the points by dragging
- **WHEN** the user drags the `In` handle near the "Chorus" marker
- **THEN** it snaps to the marker and the sheet shows "Chorus" and the new length

#### Scenario: Set the points from markers
- **WHEN** the user taps the "Chorus" flag and then the "Bridge" flag
- **THEN** `In` is Chorus and `Out` is Bridge

#### Scenario: Use the active loop
- **WHEN** a loop is active and the user chooses `Use active loop`
- **THEN** both points are filled from the loop and the recording will be a loop recording

#### Scenario: Armed playback
- **WHEN** the range is armed with a 3 second pre-roll and the user plays
- **THEN** playback starts three seconds before the in point, a countdown shows, recording begins at the in point and ends at the out point, and the strip shows the remaining time

#### Scenario: Stopping early
- **WHEN** the user presses stop or disarm during an armed recording
- **THEN** the recording ends at once and what was captured is saved

#### Scenario: Invalid range
- **WHEN** the out point is not after the in point
- **THEN** arming is unavailable and the sheet says why
