## ADDED Requirements

### Requirement: A take plays together with its track, aligned to track time
The system SHALL play a chosen take together with its track so that each moment of the take sounds at the track position where it was sung, using the stored start position, the applied latency compensation, and the take's nudge.

#### Scenario: Take starts at its recorded position
- **WHEN** the user plays the track with a take selected and the track reaches the take's start
- **THEN** the take begins at that position, aligned within the sync tolerance

#### Scenario: Playing from inside the take
- **WHEN** the user starts playback at a position after the take's start and before its end
- **THEN** the take plays from the matching point of its own audio

#### Scenario: Outside the take
- **WHEN** the track position is before the take's start or after its end
- **THEN** only the track sounds

### Requirement: Track and take stay in sync through transport changes
The system SHALL keep the take aligned through pause, resume, seek, loop wrap, and track end, and SHALL correct drift larger than the sync tolerance without an audible click.

#### Scenario: Pause and resume
- **WHEN** the user pauses and resumes
- **THEN** the take pauses with the track and resumes aligned

#### Scenario: Seek
- **WHEN** the user seeks to another position
- **THEN** the take follows to the matching point or goes silent if the position is outside it

#### Scenario: Loop wrap
- **WHEN** an active loop wraps to its start
- **THEN** the take restarts aligned with the wrapped position

#### Scenario: Drift
- **WHEN** the take drifts from its expected position by more than the tolerance
- **THEN** it is realigned with a short crossfade

### Requirement: A balance control sets the mix of track and take
The system SHALL provide a balance control between the track and the take, remembered for the session, that includes the extremes of track only and take only.

#### Scenario: Take only
- **WHEN** the balance is set fully to the take
- **THEN** the track is silent and the take sounds

#### Scenario: Centre
- **WHEN** the balance is centred
- **THEN** both sound at equal level

### Requirement: Latency is compensated by estimate, calibration, and nudge
The system SHALL apply a default latency estimate from the browser until the device is calibrated, SHALL offer a calibration that measures the round trip of the current output through the microphone and remembers it per output device, and SHALL let the user nudge a take's alignment by up to ±250 ms, saved with the take. The compensation applied at recording time SHALL be stored on the take.

#### Scenario: Not calibrated
- **WHEN** the device has not been calibrated
- **THEN** the estimate is used and labelled as an estimate

#### Scenario: Calibration
- **WHEN** the user runs calibration and the clicks reach the microphone
- **THEN** the measured latency is saved for that output device and used for later takes

#### Scenario: Calibration cannot hear the clicks
- **WHEN** the clicks are not found in the microphone signal
- **THEN** the system says so, explains how to let the sound reach the microphone, and keeps the previous value

#### Scenario: Nudge
- **WHEN** the user nudges a take by 20 ms
- **THEN** the take sounds 20 ms later relative to the track and the setting is kept with the take

#### Scenario: Recalibrating does not move old takes
- **WHEN** the device is calibrated again
- **THEN** existing takes keep the compensation they were recorded with

### Requirement: Overlay is unavailable under shaped playback
The system SHALL play a take with the track only at normal speed and zero pitch shift, and SHALL otherwise show why the overlay is unavailable instead of playing the take out of tune or time.

#### Scenario: Slowed track
- **WHEN** playback speed is not 1× while a take is selected
- **THEN** the take is silent and a message names the speed as the reason

#### Scenario: Back to normal
- **WHEN** speed and pitch return to normal
- **THEN** the take plays again aligned

### Requirement: Overlay failures are visible
The system SHALL show a message and play the track alone when a take cannot be decoded or its audio is missing.

#### Scenario: Missing audio
- **WHEN** a take's audio cannot be read from storage
- **THEN** the track plays alone and a message says the take is unavailable
