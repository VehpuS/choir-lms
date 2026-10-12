## ADDED Requirements

### Requirement: The playback screen shows the current item's lyrics

The dedicated playback screen SHALL include a `Lyrics` section for the playing item, resolved through the owning track. With lyrics it SHALL show a collapsed preview with `Show all` and `Edit`; without lyrics it SHALL show `Add lyrics`. The section SHALL NOT scroll, highlight, or otherwise track playback position, and it SHALL NOT change the position of the waveform or transport controls when it loads or changes.

#### Scenario: A track with lyrics

- **WHEN** a track with lyrics is playing
- **THEN** the Lyrics section shows the first lines with `Show all` and `Edit`, and the waveform and transport stay where they were

#### Scenario: A track without lyrics

- **WHEN** a track without lyrics is playing
- **THEN** the Lyrics section shows `Add lyrics`, which opens the lyrics editor

#### Scenario: Lyrics follow the current item

- **WHEN** playback moves to a different track
- **THEN** the section shows that track's lyrics (or the empty state) without a layout jump

### Requirement: Lyrics can be peeked from the mini-player and read full screen

The mini-player SHALL show a `Lyrics` control only while the playing item has lyrics. The control SHALL open a half-height peek over the current screen with `Expand` and `Edit`. Reading mode SHALL be a full-screen view of the lyrics with a close control and a four-step text-size control (`Small`, `Medium`, `Large`, `Extra large`) whose choice is remembered on the device and applied to the playback section, the peek, and reading mode. Reading mode SHALL use the Nocturne tokens for a dim-friendly high-contrast text column, SHALL keep playback controls reachable, and SHALL NOT scroll automatically.

#### Scenario: Peek from the mini-player

- **WHEN** a user taps `Lyrics` on the mini-player while a track with lyrics plays
- **THEN** a half-height peek shows the lyrics over the current screen and playback continues

#### Scenario: No dead control

- **WHEN** the playing item has no lyrics
- **THEN** the mini-player shows no `Lyrics` control

#### Scenario: Expand to reading mode

- **WHEN** a user taps `Expand` in the peek
- **THEN** reading mode opens full screen, and closing it returns to the previous screen

#### Scenario: Text size is remembered

- **WHEN** a user picks `Large` in reading mode and later opens the playback Lyrics section
- **THEN** the lyrics render at the `Large` size

#### Scenario: Reading mode is legible in the dark

- **WHEN** reading mode is open
- **THEN** the lyrics text meets body-text contrast on the Nocturne ground at every text size

#### Scenario: Lyrics are selectable

- **WHEN** a user presses and holds on lyrics text
- **THEN** the platform's text selection and copy controls are available
