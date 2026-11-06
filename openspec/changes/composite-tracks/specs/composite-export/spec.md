## ADDED Requirements

### Requirement: The current mix can be exported as a WAV

The system SHALL let the user export a composite's current mix from the Mix panel's `Export…` action: the stem volumes, mute and solo, the offsets, and the current speed and pitch, rendered through the mix limiter without make-up gain, as a 16-bit WAV. The export SHALL use the same dialog and destinations as recording export: a download to the device, or new Drive files in a folder the user confirms, with a resumable upload for large files.

#### Scenario: Exporting the mix

- **WHEN** the user has `Without Bass` active at 1.0× and 0 semitones and chooses `Export…`, `Download`, `Export`
- **THEN** a WAV of the mix without the Bass stem is downloaded and named `<composite name> · Without Bass.wav`

#### Scenario: Shaping included

- **WHEN** the mix is shaped at 0.7× and +2 semitones
- **THEN** the exported file has that speed and pitch applied to the whole mix

#### Scenario: Same level as playback

- **WHEN** a mix is exported
- **THEN** its level matches what the live mix sounded like through the limiter

#### Scenario: To Drive

- **WHEN** the user chooses Google Drive and confirms a folder
- **THEN** the file is uploaded with progress and failures can be retried, as for recording exports

### Requirement: Export tells the user what it will do

The export dialog for a composite SHALL describe what is rendered (the current mix and shaping, as a 16-bit WAV), show an estimated file size and duration, and let the user edit the file name. Stems that are not available SHALL be named and excluded.

#### Scenario: Estimate

- **WHEN** the dialog opens for a 3:25 composite
- **THEN** it shows the duration and an estimated size

#### Scenario: Missing stem

- **WHEN** a stem is missing
- **THEN** the dialog says that stem is not included

### Requirement: Export prepares what it needs and does not disturb playback state

The system SHALL prepare any stem that is not yet available locally before rendering and SHALL NOT change the live mix, the session mix, or the saved presets by exporting.

#### Scenario: Stem not yet prepared

- **WHEN** a stem has not been loaded and the user exports
- **THEN** the export fetches and prepares it first, with progress

#### Scenario: Live mix unchanged

- **WHEN** an export finishes
- **THEN** the Mix panel shows the same session mix as before
