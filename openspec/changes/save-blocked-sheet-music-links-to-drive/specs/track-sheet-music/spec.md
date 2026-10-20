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
