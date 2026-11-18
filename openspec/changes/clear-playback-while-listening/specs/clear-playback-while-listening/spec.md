## ADDED Requirements

### Requirement: Clear playback while pitch detection is listening

While pitch detection is listening, a track SHALL keep the sound quality it has without a microphone, on Bluetooth earbuds included. The app SHALL do this by not playing a media element while a microphone is open. The track MAY be mono while a microphone is open.

#### Scenario: A queue with pitch detection on

- **WHEN** a queue plays through Bluetooth earbuds with pitch detection on
- **THEN** each song stays at its normal quality from its start to its end, including after a pause and resume
- **AND** pitch detection keeps hearing the singer

#### Scenario: Listening is turned on during a track

- **WHEN** a person turns pitch detection on while a track plays
- **THEN** the track continues from the same position, without restarting
- **AND** from then on it plays at its normal quality

#### Scenario: Listening is turned off during a track

- **WHEN** the last listener of the microphone closes while a track plays
- **THEN** the track continues from the same position, in the same playing or paused state

#### Scenario: The track is the same track

- **WHEN** a track plays while a microphone is open
- **THEN** its loops, markers, lyrics, sheet music, waveform, speed and pitch, and the next and previous controls behave as they do without a microphone
- **AND** no composite-only control (the Mix panel, stem options) is shown for it

### Requirement: Preparing a track for listening

A track that has not been prepared SHALL be prepared once before it plays with a microphone open, and the app SHALL show that it is doing so.

#### Scenario: First time with a microphone open

- **WHEN** a track that was never prepared loads while a microphone is open
- **THEN** the player shows that it is preparing the track, with progress, and then plays it

#### Scenario: Next in the queue

- **WHEN** a queue plays with a microphone open
- **THEN** the next track is prepared while the current one plays

#### Scenario: Prepared audio has a limit

- **WHEN** prepared listening audio reaches its storage limit
- **THEN** the least recently played tracks' prepared audio is removed, never the playing track's
- **AND** the offline files view lists prepared listening audio with its size and a way to clear it

#### Scenario: A track cannot be prepared

- **WHEN** a track cannot be prepared (no room, offline with no stored copy, or it cannot be decoded)
- **THEN** it plays as it does without a microphone
- **AND** the app says once that the sound may be thin on Bluetooth earbuds while it listens

### Requirement: Background playback is kept

Opening a microphone SHALL NOT cost a person background playback.

#### Scenario: The app is hidden while listening

- **WHEN** the app is hidden while a track plays with pitch detection on
- **THEN** listening stops and the track keeps playing
- **AND** the lock-screen controls work

### Requirement: Clear playback while recording over a track

While a take is recorded over a track, the track SHALL keep its normal quality, and the take SHALL be aligned to the track as it is today.

#### Scenario: Recording over a playing track

- **WHEN** a person records over a track through Bluetooth earbuds
- **THEN** the track stays at its normal quality for the whole take
- **AND** the take is aligned to the track

#### Scenario: A take does not switch players

- **WHEN** a take is being recorded
- **THEN** the track's player does not change between the first and the last sample of the take

#### Scenario: Punching in

- **WHEN** a person punches in over a track with an earlier take
- **THEN** the track and the earlier take play at their normal quality and the new range is aligned

### Requirement: No setting that cannot work

The app SHALL NOT offer a "Sound while listening" setting.

#### Scenario: Microphone settings

- **WHEN** a person opens Settings > Microphone
- **THEN** there is no "Sound while listening" setting
