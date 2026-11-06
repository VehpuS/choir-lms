## ADDED Requirements

### Requirement: A composite track references stems and is a library item

The system SHALL provide a composite track: a library item that references two or more library tracks as stems and a mix, and stores references only, never copies of audio. A composite SHALL appear in the Library, Recents, search, playlists and the queue like a track, with a `Composite` badge and its stem count, and the Library SHALL offer a `Composites` filter. Deleting a composite SHALL NOT delete its stems, and stems SHALL remain listed as ordinary tracks.

#### Scenario: Composite in the Library

- **WHEN** the user has a composite of four stems
- **THEN** the Library lists it as a row with a `Composite · 4 stems` badge, the `Composites` filter shows it, and the four stems are still listed as tracks

#### Scenario: Playing a composite from a playlist

- **WHEN** a playlist contains a composite and the user plays it
- **THEN** it plays as a playlist item and the queue moves on when it ends

#### Scenario: Deleting a composite

- **WHEN** the user deletes a composite
- **THEN** the composite and its saved presets are removed and every stem track remains in the library

### Requirement: A composite is made from selected tracks

The system SHALL let the user make a composite from two or more selected library tracks, with `Make composite…` offered in the selection bar beside the other bulk actions. The create sheet SHALL show each selected track with an editable stem name, a name for the composite, and any warnings about alignment, and SHALL NOT mention memory unless there is a problem to report.

#### Scenario: Creating a composite

- **WHEN** the user selects four tracks, chooses `Make composite…`, confirms the names and chooses `Create`
- **THEN** a composite of the four stems is saved and appears in the Library

#### Scenario: Fewer than two tracks

- **WHEN** one track is selected
- **THEN** `Make composite…` is unavailable

#### Scenario: Stem durations are not known yet

- **WHEN** a selected track's duration cannot be read yet
- **THEN** `Create` waits until it can

### Requirement: Stems have explicit names with a best-effort default

The system SHALL give every stem a plain-text name the user can edit when creating and afterwards. The default name SHALL come from the track name: when the track name names exactly one choir section, the default SHALL be that section's label; otherwise the default SHALL be the track name. The system SHALL NOT read tags to name a stem.

#### Scenario: Name names one section

- **WHEN** a track is named `Ubi caritas · Soprano`
- **THEN** its default stem name is `Soprano`

#### Scenario: Name names no section

- **WHEN** a track is named `Ubi caritas · piano guide`
- **THEN** its default stem name is `piano guide` and the sheet says it was named from the track

#### Scenario: Name names several sections

- **WHEN** a track is named `Alto and Tenor`
- **THEN** its default stem name is the track name

#### Scenario: Renaming a stem

- **WHEN** the user edits a stem's name in the create sheet or the stem options
- **THEN** the new name is used in the mixer and is saved with the composite

### Requirement: One stem can be marked as the user's part

The system SHALL mark a stem as the user's part automatically when its name classifies to a section in the user's part preferences, and SHALL let the user switch `This is my part` on or off for any stem. The mixer SHALL show `Your part` on that stem. When no stem is marked, the presets that depend on the user's part SHALL NOT be offered.

#### Scenario: Automatic mark

- **WHEN** the user's part preference is Bass and a stem is named `Bass`
- **THEN** that stem is marked as the user's part

#### Scenario: No stem marked

- **WHEN** none of the stems matches the user's parts and none is marked by hand
- **THEN** the presets menu offers only the presets that do not depend on the user's part

### Requirement: Stems start together, shorter stems are padded, and a stem can have an offset

The system SHALL start every stem at composite time zero, make the composite as long as its longest stem (counting offsets), and play a shorter stem as silence after its end. A stem SHALL have an offset in milliseconds, default zero, that shifts it later when positive and earlier when negative. The create sheet SHALL warn when stem durations differ by more than one second and SHALL say that shorter stems are padded.

#### Scenario: Shorter stem

- **WHEN** one stem is six seconds shorter than the others
- **THEN** the create sheet warns about it, the composite is as long as the longest stem, and the shorter stem is silent for its last six seconds

#### Scenario: Offset

- **WHEN** the user sets a stem's offset to +250 ms
- **THEN** that stem sounds 250 ms later than before and the composite's length accounts for it

#### Scenario: Negative offset

- **WHEN** the user sets a stem's offset to −100 ms
- **THEN** the first 100 ms of that stem are not played

### Requirement: A stem that cannot be loaded is flagged and skipped

The system SHALL play the stems that are available when another stem's track was removed from the library or cannot be loaded, and SHALL show that stem in the mixer as `Stem missing` with `Re-link` and `Remove` actions. A composite whose stems are all unavailable SHALL be shown as unavailable and SHALL NOT start playback.

#### Scenario: One stem removed from the library

- **WHEN** a stem's track was deleted from the library and the user plays the composite
- **THEN** the other stems play and the missing stem's row says `Stem missing`

#### Scenario: Re-linking

- **WHEN** the user chooses `Re-link` and picks another library track
- **THEN** that track becomes the stem and the row returns to normal

#### Scenario: Removing a stem down to one

- **WHEN** the user removes a stem and only one remains
- **THEN** the system asks whether to delete the composite instead of leaving a single-stem composite

#### Scenario: No stem available

- **WHEN** every stem is unavailable
- **THEN** the composite is shown as unavailable and does not start

### Requirement: A composite owns its loops and markers

The system SHALL store loops and markers made on a composite against the composite, in composite time, and SHALL list them in the composite's views the way a track's are listed.

#### Scenario: Loop on a composite

- **WHEN** the user saves a loop from 1:05 to 1:35 while a composite plays
- **THEN** the loop belongs to the composite and plays the same range of the mix

#### Scenario: Markers are not copied from stems

- **WHEN** a stem track has markers
- **THEN** the composite does not show them

### Requirement: A composite's sheet music is the union of its stems' sources

The system SHALL show, for a composite, the sheet music sources of every stem plus any added to the composite itself, with duplicates removed (a source with the same location appears once), and SHALL show which stems use each source. The system SHALL NOT copy any file. The per-record limit on sheet music sources SHALL apply when adding a source to a record, not to the combined list.

#### Scenario: File shared by all stems

- **WHEN** all four stems link the same score PDF and Bass also links a part PDF
- **THEN** the sheet music view lists the score once, marked as used by all four stems, and the part PDF once, marked as used by Bass

#### Scenario: Added to the composite

- **WHEN** the user adds a MIDI file from the sheet music view of a composite
- **THEN** it is stored on the composite, listed as added to this composite, and no stem is changed

### Requirement: A composite's lyrics come from its stems

The system SHALL read lyrics for a composite from its stems. When more than one stem has lyrics, the lyrics view SHALL show a picker of those stems, default to the last stem picked (stored with the composite) or else the first, and SHALL show no picker when only one stem has lyrics. Editing lyrics from a composite SHALL edit the picked stem's lyrics and name that stem.

#### Scenario: Two stems have lyrics

- **WHEN** Soprano and Alto have lyrics and the user opens the lyrics view
- **THEN** a picker offers Soprano and Alto, and the view says Tenor and Bass have none

#### Scenario: One stem has lyrics

- **WHEN** only Soprano has lyrics
- **THEN** the view shows those lyrics with no picker

#### Scenario: No stem has lyrics

- **WHEN** no stem has lyrics
- **THEN** the view offers the existing way to add them, and the lyrics are saved on the stem the user picks

### Requirement: A composite is saved locally

The system SHALL save composites in local library storage on the device, like adjusted tracks, and SHALL NOT write them to Drive.

#### Scenario: Reopening the app

- **WHEN** the user reopens the app
- **THEN** the composites, their stem names, offsets, presets and added sheet music are still there

### Requirement: Composites play on web only for now

The system SHALL offer composite creation and playback only where composite playback is supported (web), and SHALL show a composite on an unsupported platform as unavailable with a message, without error.

#### Scenario: Native device

- **WHEN** a composite appears in a list on a native device
- **THEN** it is shown as unavailable with a message that composites play on web for now
