## ADDED Requirements

### Requirement: The playback screen supports markers

The dedicated playback screen overflow SHALL include `Markers` (opening the list for the playing item's owning track) and `Add marker here` (adding at the current position). The playback waveform SHALL draw marker flags per the active filter, SHALL add a marker on a long-press at the pressed position, and SHALL jump on a flag tap. The markers list SHALL be a bottom sheet with the filter (`All` / `My markers`), `Add marker here`, `Select` for choosing two markers, `Create loops from markers`, and rows showing the name and time; a row tap jumps and a row menu offers the actions for its kind. Adding, jumping, and flag display SHALL NOT move the waveform or transport controls.

#### Scenario: Open from the overflow

- **WHEN** the user opens the playback screen overflow and chooses `Markers`
- **THEN** a sheet lists the track's markers with the filter, and the playback stays undisturbed

#### Scenario: Flags and long-press

- **WHEN** the user long-presses the waveform
- **THEN** a flag appears at that point, a confirmation offers `Rename`, and the layout of the screen does not shift

#### Scenario: Empty state

- **WHEN** a track has no markers and no loops
- **THEN** the sheet says `No markers yet` and offers `Add marker here` when the track is loaded
