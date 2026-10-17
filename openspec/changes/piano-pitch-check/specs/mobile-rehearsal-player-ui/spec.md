## ADDED Requirements

### Requirement: The piano is reachable from playback and the sheet music viewer

The dedicated playback screen SHALL include a piano control in its transport area, the mini-player SHALL include a piano control, and the sheet music viewer toolbar (and its rail in the compact layout) SHALL include a piano toggle. Each SHALL show the open state (pressed) and be at least 44 pt, use a keyboard icon from the shared icon map, and carry the accessibility label `Open piano` / `Close piano`. The controls SHALL be absent where the piano cannot play. Opening the piano SHALL NOT move the waveform, transport, or mini-player; the overlay docks above them and the content area above shrinks.

#### Scenario: Open from the mini-player

- **WHEN** the user taps the piano control on the mini-player on any screen
- **THEN** the piano overlay docks above the mini-player and the screen content above it shrinks to fit

#### Scenario: Open from the playback screen

- **WHEN** the user taps the piano control on the playback screen
- **THEN** the piano opens, the waveform and transport keep their positions in view, and the pressed state shows on the control

#### Scenario: Open from the viewer

- **WHEN** the user taps the piano toggle in the sheet music viewer
- **THEN** the keyboard docks under the score and the score area shrinks to the space above it

### Requirement: Settings includes a Piano section

The Settings screen SHALL include a `Piano` section with `Sound` (`Piano`, `Organ`), `Show every note name` (`Off`, `On`), and `Black key names` (`Sharps`, `Flats`) rows in the same style as the existing preference rows.

#### Scenario: Change a piano preference

- **WHEN** the user picks `Flats` for `Black key names`
- **THEN** black keys labelled in flats read `B♭` instead of `A♯` the next time the keyboard shows labels
