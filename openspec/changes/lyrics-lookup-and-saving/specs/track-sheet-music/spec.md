## ADDED Requirements

### Requirement: A saved track can carry sheet music sources as links

The system SHALL let a user attach zero or more sheet music sources to a saved track, up to 10, each with a label and a location that is either a Google Drive file or a web URL, stored with the track in the library and persisted across app restarts. The system SHALL store only the link, the label, the detected format, and the part selection; it SHALL NOT copy, host, or upload the score. Sheet music SHALL be optional and SHALL NOT appear as a section, preview, or empty-state prompt on the playback screen.

#### Scenario: Attach a Drive file

- **WHEN** a user chooses `Sheet music`, then `Add sheet music`, then `From Google Drive`, and picks a supported file
- **THEN** a source with that file's name as its label is added to the track and is present after the app restarts

#### Scenario: Attach a web link

- **WHEN** a user pastes `https://example.org/scores/kyrie-alto.pdf` and confirms
- **THEN** a source with a label the user can edit is added, with its format detected as PDF

#### Scenario: Several sources on one track

- **WHEN** a user attaches `Full score` and `Alto part` to the same track
- **THEN** both are listed in the order added, each with its own part selection

#### Scenario: The limit

- **WHEN** a track already has 10 sources
- **THEN** `Add sheet music` is unavailable and the sheet explains the limit

#### Scenario: Unsupported file or link

- **WHEN** a user picks or pastes a file whose format is not one of PDF, MusicXML, MIDI, or a MuseScore file or page
- **THEN** it is refused with a message that names the supported formats, and nothing is added

#### Scenario: Remove and rename

- **WHEN** a user renames or removes a source from the manager sheet
- **THEN** the track's list updates, and removing the last source leaves the track with no sheet music field

### Requirement: Sheet music can be searched on MuseScore without leaving a record of it

The system SHALL offer `Search MuseScore` in the add flow, which opens the system browser on a MuseScore search for the Title and Artist shown in the add flow, and SHALL accept the result back as a pasted `musescore.com` link or as a file the user saved to Drive or hosted at a URL. The system SHALL NOT fetch, scrape, or download from MuseScore on the user's behalf and SHALL NOT require a MuseScore account.

#### Scenario: Search from the add flow

- **WHEN** a user taps `Search MuseScore` with Title `Kyrie` and Artist `Mozart`
- **THEN** the system browser opens a MuseScore search for `Kyrie Mozart`, and the app state is unchanged

#### Scenario: A MuseScore page link

- **WHEN** a user pastes a `musescore.com` score page link
- **THEN** a source is added that opens in the system browser and says `Opens outside the app`

#### Scenario: A MuseScore file

- **WHEN** a user adds a `.mscz` or `.mscx` file from Drive
- **THEN** it is added as a source that opens outside the app, with a hint to export MusicXML from MuseScore for display in the app

### Requirement: Sheet music opens only in full screen and is rendered as music

The system SHALL open a sheet music source only in a full-screen viewer, reached from the `Sheet music` manager sheet, and SHALL show: PDF sources as rendered pages; MusicXML (`.musicxml`, `.xml`, `.mxl`) sources as rendered staves; and MIDI sources as staves notated from the file, labelled as approximate. The viewer SHALL provide a close control, a switcher between the track's sources, zoom, and a play/pause control so playback stays reachable, and SHALL keep the screen awake while open.

#### Scenario: Open a PDF

- **WHEN** a user taps `View` on a PDF source
- **THEN** the full-screen viewer shows the PDF's pages and closing it returns to the previous screen with playback unchanged

#### Scenario: Open MusicXML

- **WHEN** a user opens a MusicXML source
- **THEN** its staves are rendered as notation, not as a picture of a file or as text

#### Scenario: Open MIDI

- **WHEN** a user opens a MIDI source
- **THEN** staves notated from the MIDI are shown, through the same renderer and part filter as MusicXML, with no label marking them as converted

#### Scenario: Switch between sources

- **WHEN** a track has `Full score` and `Alto part` and the user switches source in the viewer
- **THEN** the other source loads in place, with its own saved part selection

#### Scenario: No preview on the playback screen

- **WHEN** a track with sheet music plays
- **THEN** the playback screen and the mini-player show no sheet music section, preview, or control

### Requirement: MusicXML and MIDI parts can be filtered, showing vocal parts by default

For MusicXML and MIDI sources the viewer SHALL list the file's parts and SHALL show only the vocal parts by default, with `All parts` and per-part toggles to change what is shown. When no vocal part is recognized the viewer SHALL show all parts and say that no vocal parts were recognized. The choice SHALL be saved on the source and applied the next time it opens; if a saved part no longer exists in the file, the selection SHALL fall back to the vocal parts. PDF sources SHALL NOT offer part filtering.

#### Scenario: Vocal parts by default

- **WHEN** a user opens a MusicXML source with parts Soprano, Alto, Tenor, Bass, and Piano
- **THEN** Soprano, Alto, Tenor, and Bass are shown and Piano is hidden, with Piano available to switch on

#### Scenario: Choose one part

- **WHEN** a user switches off every part except Alto
- **THEN** only the Alto staff is shown, and reopening the source shows only Alto

#### Scenario: No vocal part recognized

- **WHEN** a source's parts are named `Track 1` and `Track 2`
- **THEN** both are shown and the viewer says that no vocal parts were recognized

#### Scenario: A saved part is gone

- **WHEN** the file at a source changes so a saved part no longer exists
- **THEN** the viewer falls back to the vocal parts

#### Scenario: PDFs

- **WHEN** a PDF source is open
- **THEN** no part controls are shown

### Requirement: Loading a source is on demand and fails clearly

The system SHALL fetch a sheet music source only when the viewer opens it, SHALL cancel the request when the viewer closes, and SHALL show a specific message with a next step for each failure: Drive access needed, file not found, a web host that blocks browser requests, a file over the size limit, an unsupported or unreadable file, no connection, or the file source unavailable. A failure SHALL NOT change the stored sources.

#### Scenario: Drive access expired

- **WHEN** a Drive source is opened while Drive authorization has expired
- **THEN** the viewer says Drive access is needed and offers to reconnect

#### Scenario: Host blocks browser requests

- **WHEN** a web source's host does not allow the request from the web build
- **THEN** the viewer offers `Open in browser` and suggests saving the file to Drive

#### Scenario: Too large

- **WHEN** a file is over 25 MB
- **THEN** it is not loaded, and the viewer says so and offers `Open in browser` for a URL source

#### Scenario: Nothing fetched until opened

- **WHEN** a user adds a web source
- **THEN** no request for the file is made until the viewer opens it

### Requirement: Loops and adjusted tracks share their parent track's sheet music

The system SHALL resolve the sheet music of a loop, an adjusted track, or a loop of an adjusted track to the saved track that owns it, SHALL NOT store a copy on a derived item, and SHALL name the owning track in the manager sheet. Removing a track SHALL remove its sheet music links, and a derived item whose owning track no longer exists SHALL show no sheet music.

#### Scenario: A loop opens its track's sheet music

- **WHEN** a user chooses `Sheet music` on a loop whose track has sources
- **THEN** the manager sheet lists the track's sources and its subtitle names that track

#### Scenario: Removing a track removes its links

- **WHEN** a user removes a track from the library
- **THEN** its sheet music links are removed with it
