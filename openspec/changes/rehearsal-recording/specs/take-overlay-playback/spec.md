## ADDED Requirements

### Requirement: A take plays together with its track, aligned to track time
The system SHALL play a chosen take together with its track so that each moment of the take sounds at the track position where it was sung, using the take's timeline, the applied latency compensation, and the take's nudge.

#### Scenario: Take starts at its recorded position
- **WHEN** the user plays the track with a take selected and the track reaches the take's first segment
- **THEN** the take begins at that position, aligned within the sync tolerance

#### Scenario: Playing from inside the take
- **WHEN** the user starts playback at a position inside a segment of the take
- **THEN** the take plays from the matching point of its own audio

#### Scenario: Outside the take
- **WHEN** the track position is outside every segment of the take
- **THEN** only the track sounds

### Requirement: Track and take stay in sync through transport changes
The system SHALL keep the take aligned through pause, resume, seek, loop wrap, and track end, and SHALL correct drift larger than the sync tolerance without an audible click.

#### Scenario: Pause and resume
- **WHEN** the user pauses and resumes
- **THEN** the take pauses with the track and resumes aligned

#### Scenario: Seek
- **WHEN** the user seeks to another position
- **THEN** the take follows to the matching point or goes silent if the position is outside it

#### Scenario: Drift
- **WHEN** the take drifts from its expected position by more than the tolerance
- **THEN** it is realigned with a short crossfade

### Requirement: Loop takes follow the loop pass by pass
The system SHALL, when a loop take is selected and its loop is active, play pass n of the take over pass n of the loop, and SHALL be silent after the last recorded pass.

#### Scenario: Second pass
- **WHEN** the loop wraps for the second time
- **THEN** the take plays its second recorded pass, aligned with the loop start

#### Scenario: Beyond the recorded passes
- **WHEN** the loop wraps more times than the take has passes
- **THEN** the take is silent and the track keeps looping

### Requirement: A take always plays with the speed and pitch it was recorded against
The system SHALL play a take with the track's speed and pitch set to those stored on the take, SHALL lock the speed and pitch controls while the take is selected, SHALL restore the previous shaping when the take is deselected, and SHALL always play the take itself at its natural speed and pitch.

#### Scenario: Selecting a take
- **WHEN** the user selects a take recorded against the track at 0.7× with a two-semitone shift
- **THEN** the track's speed and pitch are set to 0.7× and +2, the controls are locked with a note saying why, and the take stays aligned through its whole length

#### Scenario: Deselecting a take
- **WHEN** the user deselects the take
- **THEN** the speed and pitch return to what they were before the take was selected and the controls unlock

#### Scenario: The take itself is never shaped
- **WHEN** a take plays with a track shifted up two semitones
- **THEN** the take's own pitch and speed are unchanged

#### Scenario: Another speed is not offered
- **WHEN** the user wants to hear a take at another speed
- **THEN** the controls stay locked, and the exported mixdown can be played with the ordinary track controls

### Requirement: A balance control sets the mix of track and take
The system SHALL provide a balance control between the track and the take, remembered for the session, that includes the extremes of track only and take only.

#### Scenario: Take only
- **WHEN** the balance is set fully to the take
- **THEN** the track is silent and the take sounds

#### Scenario: Centre
- **WHEN** the balance is centred
- **THEN** both sound at equal level

### Requirement: Alignment can be adjusted by hand quickly, and kept as the device default
The system SHALL provide a sync control beside the balance control with fine steps (1 ms and 10 ms), a range of at least ±250 ms, and a reset, whose changes sound immediately while the overlay plays and are saved with the take. It SHALL offer to keep the current nudge as the default compensation for the current output device, so later takes start already adjusted.

#### Scenario: Nudge while listening
- **WHEN** the user presses the 10 ms step twice during overlay playback
- **THEN** the take sounds 20 ms later relative to the track at once and the setting is kept with the take

#### Scenario: Keep for this device
- **WHEN** the user chooses to use the nudge for this device
- **THEN** the next take recorded on that output device is compensated by it

#### Scenario: Changing the default does not move old takes
- **WHEN** the device default changes
- **THEN** existing takes keep the compensation they were recorded with, plus their own nudge

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
- **WHEN** the user records and plays takes without opening the calibration
- **THEN** no calibration is requested

### Requirement: Overlay failures are visible
The system SHALL show a message and play the track alone when a take cannot be decoded or its audio is missing.

#### Scenario: Missing audio
- **WHEN** a take's audio cannot be read from storage
- **THEN** the track plays alone and a message says the take is unavailable
