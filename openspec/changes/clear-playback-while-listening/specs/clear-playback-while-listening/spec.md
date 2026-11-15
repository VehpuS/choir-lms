## ADDED Requirements

### Requirement: Clear playback while the microphone is open

Playback SHALL stay at its normal quality for a person on Bluetooth earbuds while pitch detection or recording is on, or the app SHALL tell the person plainly that it cannot and what to do instead.

#### Scenario: A queue with pitch detection on

- **WHEN** a queue plays through Bluetooth earbuds with pitch detection on
- **THEN** each song stays at its normal quality from its start to its end, including after a pause and resume

#### Scenario: Recording over a playing track

- **WHEN** a person records over a playing track through Bluetooth earbuds
- **THEN** the track stays at its normal quality and the take is aligned to the track

#### Scenario: The platform cannot do it

- **WHEN** the platform cannot keep the earbuds' output at normal quality while a microphone is open
- **THEN** the app says so where the microphone is turned on, and names what sounds better (the speaker, or wired headphones)
