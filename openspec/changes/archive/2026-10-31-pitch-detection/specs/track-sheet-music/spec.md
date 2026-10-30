## ADDED Requirements

### Requirement: The score marks notes that match the sung pitch

While pitch detection is listening and a MusicXML or MIDI score is showing, the viewer SHALL mark the notes in view whose sounding pitch matches the sung note, following the matching rules of `pitch-detection` and honouring part transposition and the active pitch offset of the playing item (a sung note is compared with the written pitch plus that offset). While the offset is not zero the viewer SHALL show it, for example `Following track pitch −2 st`. Exact matches SHALL carry a strong mark. When `Show other-octave matches` (a row of the `Practice tools` menu while this viewer is open) is on, same-note-other-octave matches SHALL carry a visibly softer mark that cannot be mistaken for the strong one; when it is off, they SHALL carry none. It SHALL mark only notes currently in view, SHALL clear marks when the sung note ends or changes, and SHALL NOT scroll, turn pages, change the selected part, or alter playback. PDF scores SHALL show no marks.

#### Scenario: Sing a note on the page

- **WHEN** a score with several A4 notes in view is showing and the user sings A4
- **THEN** every A4 note in view is marked, and no note outside the view is touched

#### Scenario: The note changes

- **WHEN** the user moves from A4 to B4
- **THEN** the A4 marks clear and the B4 notes in view are marked

#### Scenario: Soft marks for another octave

- **WHEN** `Show other-octave matches` is on, A4 and A3 notes are in view, and the user sings A4
- **THEN** the A4 notes carry the strong mark and the A3 notes carry the soft mark

#### Scenario: Soft marks are off by default

- **WHEN** the setting has never been changed and the user sings A4 with A3 notes in view
- **THEN** only A4 notes are marked

#### Scenario: The track is pitch-shifted

- **WHEN** the playing track is shifted down 2 semitones, the score has A4 notes in view, and the user sings G4
- **THEN** the A4 notes are marked and the viewer shows `Following track pitch −2 st`

#### Scenario: The track is slowed down

- **WHEN** the playing track runs at 0.75× with no pitch shift and the user sings A4
- **THEN** the A4 notes are marked exactly as at normal speed and no offset is shown

#### Scenario: Transposing part

- **WHEN** the shown part is a transposing part and the user sings the sounding pitch of a written note
- **THEN** that written note is marked

#### Scenario: PDF

- **WHEN** a PDF score is showing and the user sings
- **THEN** no marks appear and the score is unaffected
