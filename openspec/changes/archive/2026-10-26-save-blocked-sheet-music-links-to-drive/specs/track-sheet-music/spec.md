## MODIFIED Requirements

### Requirement: Loading a source is on demand and fails clearly

The system SHALL fetch a sheet music source only when the viewer opens it, SHALL cancel the request when the viewer closes, and SHALL show a specific message with a next step for each failure: Drive access needed, file not found, a web host that blocks browser requests, a web host that cannot be reached, a file over the size limit, a file that is not the kind of sheet music the source claims (saying whether it is a web page, not MusicXML, or in an encoding that cannot be read), no connection, or the file source unavailable. A failure SHALL NOT change the stored sources.

#### Scenario: Drive access expired

- **WHEN** a Drive source is opened while Drive authorization has expired
- **THEN** the viewer says Drive access is needed and offers to reconnect

#### Scenario: Host blocks browser requests

- **WHEN** a web source's host does not allow the request from the web build
- **THEN** the viewer says the site does not let the app read the file
- **AND** offers `Save to Drive` and `Open in browser`

#### Scenario: Host cannot be reached

- **WHEN** a web source's host does not answer at all
- **THEN** the viewer says the site could not be reached, and does not offer `Save to Drive`

#### Scenario: The link returns a web page

- **WHEN** a source that should be a score returns a web page instead
- **THEN** the viewer says the link opens a web page, not a score file

#### Scenario: Too large

- **WHEN** a file is over 25 MB
- **THEN** it is not loaded, and the viewer says so and offers `Open in browser` for a URL source

#### Scenario: Nothing fetched until opened

- **WHEN** a user adds a web source
- **THEN** no request for the file is made until the viewer opens it

## ADDED Requirements

### Requirement: MusicXML opens whatever text encoding it was saved in

The system SHALL open uncompressed MusicXML saved as UTF-8 (with or without a byte-order mark) or UTF-16 (either byte order), and compressed `.mxl` files, and SHALL render the same score from each.

#### Scenario: UTF-16 MusicXML

- **WHEN** a MusicXML source saved as UTF-16 is opened
- **THEN** the score is drawn with its lyrics, as the UTF-8 file would be

#### Scenario: UTF-8 with a byte-order mark

- **WHEN** a MusicXML source starts with a UTF-8 byte-order mark
- **THEN** the score is drawn

#### Scenario: An unreadable encoding

- **WHEN** a source claims to be MusicXML but its text cannot be decoded
- **THEN** the viewer says the file's encoding cannot be read, not that it is not MusicXML

### Requirement: A PDF can be zoomed by gesture as well as by the zoom controls

The system SHALL let a user zoom a PDF in the web viewer by pinching, by holding `Ctrl` or `Cmd` while scrolling the wheel, and by double-tapping or double-clicking to toggle between fitting the page width and a readable zoom, in addition to the zoom controls. Zoom SHALL stay within the same minimum and maximum as the controls, SHALL keep the point under the pointer in place, and SHALL zoom the PDF rather than the browser page.

#### Scenario: Pinch to zoom

- **WHEN** a user pinches on an open PDF
- **THEN** the pages zoom around the pinch point and the zoom value in the toolbar follows

#### Scenario: Wheel zoom on desktop

- **WHEN** a user scrolls the wheel with `Ctrl` or `Cmd` held over an open PDF
- **THEN** the PDF zooms and the browser page does not

#### Scenario: Double-tap toggles

- **WHEN** a user double-taps a PDF that is fitted to the width
- **THEN** it zooms to a readable size at the tapped point
- **AND** a second double-tap returns to fitting the width

#### Scenario: Limits

- **WHEN** a gesture would zoom beyond the zoom controls' minimum or maximum
- **THEN** the zoom stops at that limit
