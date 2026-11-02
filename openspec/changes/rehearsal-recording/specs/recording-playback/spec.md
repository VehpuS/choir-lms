## ADDED Requirements

### Requirement: A recording plays in the context it was made in, locked

The system SHALL treat a recording as a playable item and, when it is selected, play it in the context it was made in: the loop for a loop recording, the saved adjusted track for a recording of an adjusted track, and the owning track limited to the recorded range for a segment or punch recording. The view SHALL show only the recorded range and, for a segment or punch recording, stop at its end; SHALL apply the recording's stored speed and pitch (including adjustments that were never saved); and SHALL lock the range, the loop, the speed, and the pitch while the recording is the active item. Playing another item SHALL release the locks.

#### Scenario: Loop recording

- **WHEN** the user plays a recording made on the "Chorus" loop
- **THEN** the loop plays with its range as the only playable range and the loop, speed, and pitch are locked

#### Scenario: Segment recording

- **WHEN** the user plays a recording that covered 1:05 to 1:35 of a track
- **THEN** the track plays showing only 1:05 to 1:35, seeking stays within it, and playback stops at 1:35

#### Scenario: Adjusted track

- **WHEN** the user plays a recording made on a saved adjusted track
- **THEN** the adjusted track plays with its adjustment active and locked

#### Scenario: Adjustment that is not a saved track

- **WHEN** the user plays a recording that was made with a session adjustment of 0.7× and +2
- **THEN** the track plays with 0.7× and +2 applied and locked, without creating or saving an adjusted track, and the view does not label the adjustment as unsaved

#### Scenario: Playing something else

- **WHEN** the user plays another track, loop, or recording while a recording is the active item
- **THEN** that item's own range, speed, and pitch apply and the controls unlock

### Requirement: A recording plays together with its track, aligned to track time

The system SHALL play a recording together with its track so that each moment of the recording sounds at the track position where it was sung, using its timeline, the applied latency compensation, and the recording's nudge.

#### Scenario: Recording starts at its recorded position

- **WHEN** the user plays the track with a recording open and the track reaches the recording's first segment
- **THEN** the recording begins at that position, aligned within the sync tolerance

#### Scenario: Playing from inside the recording

- **WHEN** the user starts playback at a position inside a segment of the recording
- **THEN** the recording plays from the matching point of its own audio

#### Scenario: Outside the recording

- **WHEN** the track position is outside every segment of the recording
- **THEN** only the track sounds

### Requirement: Track and recording stay in sync through transport changes

The system SHALL keep the recording aligned through pause, resume, seek, loop wrap, and track end, and SHALL correct drift larger than the sync tolerance without an audible click.

#### Scenario: Pause and resume

- **WHEN** the user pauses and resumes
- **THEN** the recording pauses with the track and resumes aligned

#### Scenario: Seek

- **WHEN** the user seeks to another position
- **THEN** the recording follows to the matching point or goes silent if the position is outside it

#### Scenario: Drift

- **WHEN** the recording drifts from its expected position by more than the tolerance
- **THEN** it is realigned with a short crossfade

### Requirement: Loop recordings follow the loop pass by pass

The system SHALL, when a loop recording is open, play pass n of the recording over pass n of the loop, and SHALL be silent after the last recorded pass.

#### Scenario: Second pass

- **WHEN** the loop wraps for the second time
- **THEN** the recording plays its second recorded pass, aligned with the loop start

#### Scenario: Beyond the recorded passes

- **WHEN** the loop wraps more times than the recording has passes
- **THEN** the recording is silent and the track keeps looping

### Requirement: A recording always plays with the speed and pitch it was recorded against

The system SHALL play a recording with the track's speed and pitch set to those stored on the recording, SHALL lock the speed and pitch controls while it is open, and SHALL always play the recording itself at its natural speed and pitch.

#### Scenario: Opening a recording

- **WHEN** the user opens a recording recorded against a track at 0.7× with a two-semitone shift
- **THEN** the track's speed and pitch are set to 0.7× and +2, the controls are locked with a note saying why, and the recording stays aligned through its whole length

#### Scenario: The recording itself is never shaped

- **WHEN** a recording plays with a track shifted up two semitones
- **THEN** the recording's own pitch and speed are unchanged

#### Scenario: Another speed is not offered

- **WHEN** the user wants to hear a recording at another speed
- **THEN** the controls stay locked, and the exported mix can be played with the ordinary track controls

### Requirement: The original track audio is found from the recording's metadata

The system SHALL fetch the original track audio for the overlay from the normal playback cache, the offline store, or Drive using the recording's stored file id, without keeping or pinning a copy of the track for the recording. If the content version differs, it SHALL play the overlay against the current file and say `Original track changed`. If the original cannot be fetched, it SHALL play the recording alone and say why.

#### Scenario: Track in the cache

- **WHEN** the original track audio is in the playback cache or kept offline
- **THEN** the overlay plays without a download

#### Scenario: Track evicted

- **WHEN** the original was removed from the caches and the device is online
- **THEN** the overlay downloads the original from Drive through the normal track path and then plays

#### Scenario: Original changed

- **WHEN** the file's content version differs from the one the recording was made against
- **THEN** the overlay plays against the current file, shows `Original track changed`, and the sync control remains available

#### Scenario: Original unavailable

- **WHEN** the original was deleted, or the device is offline and the track is not stored
- **THEN** the recording plays alone with a message saying the overlay needs the original track

### Requirement: A balance control sets the mix of track and recording

The system SHALL provide a balance control between the track and the recording that includes the extremes of track only and recording only. A recording SHALL start at the balance saved with it, moving the control SHALL change only the current listening session, and the user SHALL be able to keep the current position as the recording's saved balance.

#### Scenario: Recording only

- **WHEN** the balance is set fully to the recording
- **THEN** the track is silent and the recording sounds

#### Scenario: Starting balance

- **WHEN** the user plays a recording whose saved balance is 70
- **THEN** the control starts at 70 and the track is turned down accordingly

#### Scenario: Live adjustment is not saved

- **WHEN** the user moves the balance while listening and plays the recording again later
- **THEN** it starts at the saved balance, not the moved one

#### Scenario: Save as default

- **WHEN** the user moves the balance and chooses `Save as default`
- **THEN** that position becomes the recording's saved balance for later playback, queues, playlists, and the export default

#### Scenario: Centre

- **WHEN** the balance is centred
- **THEN** both sound at equal level

### Requirement: Alignment can be adjusted by hand quickly, and kept as the device default

The system SHALL provide a sync control beside the balance control with fine steps (1 ms and 10 ms), a range of at least ±250 ms, and a reset, whose changes sound immediately while the overlay plays and are saved with the recording. It SHALL offer to keep the current nudge as the default compensation for the current output device, so later recordings start already adjusted.

#### Scenario: Nudge while listening

- **WHEN** the user presses the 10 ms step twice during overlay playback
- **THEN** the recording sounds 20 ms later relative to the track at once and the setting is kept with the recording

#### Scenario: Keep for this device

- **WHEN** the user chooses to use the nudge for this device
- **THEN** the next recording made on that output device is compensated by it

#### Scenario: Changing the default does not move old recordings

- **WHEN** the device default changes
- **THEN** existing recordings keep the compensation they were recorded with, plus their own nudge

### Requirement: Latency has an estimated default and an opt-in click calibration

The system SHALL use a latency estimate from the browser until the user sets something better, and label it as an estimate. It SHALL offer a click calibration as an optional action that measures the round trip of the current output through the microphone and saves it as the device default, and SHALL NOT prompt for calibration or require it.

#### Scenario: Not calibrated

- **WHEN** the device has not been adjusted or calibrated
- **THEN** the estimate is used and labelled as an estimate

#### Scenario: Calibration

- **WHEN** the user runs calibration and the clicks reach the microphone
- **THEN** the measured latency is saved as the default for that output device

#### Scenario: Calibration cannot hear the clicks

- **WHEN** the clicks are not found in the microphone signal
- **THEN** the system says so, explains how to let the sound reach the microphone or to use the manual sync control instead, and keeps the previous value

#### Scenario: Never prompted

- **WHEN** the user records and plays recordings without opening the calibration
- **THEN** no calibration is requested

### Requirement: Overlay failures are visible

The system SHALL show a message and play the track alone when a recording cannot be decoded or its audio is missing.

#### Scenario: Missing audio

- **WHEN** a recording's audio cannot be read from storage
- **THEN** the track plays alone and a message says the recording is unavailable
