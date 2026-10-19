## ADDED Requirements

### Requirement: A saved track can hold one body of lyrics

The system SHALL let a user save one plain-text body of lyrics on a saved track, stored with the track in the library and persisted across app restarts. The text SHALL be normalized when it is saved (line endings unified, trailing whitespace trimmed, runs of blank lines collapsed) and SHALL NOT exceed 20,000 characters. Saving an empty body SHALL remove the lyrics.

#### Scenario: Type and save lyrics

- **WHEN** a user opens the lyrics editor for a saved track, types lyrics, and presses `Save`
- **THEN** the lyrics are stored with the track, the editor closes, and the lyrics are present after the app restarts

#### Scenario: Edit existing lyrics

- **WHEN** a user opens the editor for a track that has lyrics, changes the text, and presses `Save`
- **THEN** the stored lyrics are replaced by the edited text and the track's lyrics `updatedAt` changes

#### Scenario: Delete lyrics

- **WHEN** a user chooses `Delete lyrics` and confirms
- **THEN** the track no longer has lyrics and its menu entry reads `Lyrics` again

#### Scenario: Saving an empty body removes the lyrics

- **WHEN** a user clears the text and presses `Save`
- **THEN** no empty lyrics record is stored

#### Scenario: Over-long text is refused

- **WHEN** the text exceeds 20,000 characters
- **THEN** `Save` is disabled and the editor shows the character count and the limit

#### Scenario: Unsaved edits are not lost silently

- **WHEN** a user has unsaved changes and closes the editor
- **THEN** the editor asks `Discard changes?` before closing

### Requirement: Lyrics can be looked up as a suggestion and are never saved automatically

The system SHALL offer a `Look up` action in the lyrics editor that searches an open lyrics service by title, artist, and track length, and SHALL list the candidates with their title, artist, and length difference. Choosing a candidate SHALL load its plain text into the editor for review and editing; the system SHALL NOT save looked-up text until the user presses `Save`. Lookup SHALL run only when the user taps `Look up`, SHALL ignore any synced or timestamped lyrics, and SHALL disclose before the first lookup that the title, artist, and track length are sent to the lyrics service.

#### Scenario: Look up and review before saving

- **WHEN** a user taps `Look up` with Title and Artist filled in and chooses a candidate
- **THEN** the candidate's plain lyrics fill the text field, the track's stored lyrics are unchanged, and pressing `Save` stores them

#### Scenario: Title and artist can be corrected before searching

- **WHEN** the editor opens for a track named `04_Mezmerize.mp3`
- **THEN** Title is pre-filled as `Mezmerize`, Artist is empty and editable, and no request has been sent

#### Scenario: First lookup is disclosed

- **WHEN** a user taps `Look up` for the first time on this device
- **THEN** the editor states that title, artist, and track length are sent to the lyrics service before the search runs, and the acknowledgement is remembered

#### Scenario: Timed lyrics are stripped

- **WHEN** a candidate's text contains timestamp markers such as `[01:23.45]`
- **THEN** the loaded text contains the words without the markers

#### Scenario: No results

- **WHEN** the service returns no candidates
- **THEN** the editor shows `No lyrics found` with `Search the web` and typing as next steps

#### Scenario: The service is unreachable

- **WHEN** the lookup fails because the device is offline, the service is rate limiting, or the service is unavailable
- **THEN** the editor shows a specific message with a `Try again` action, keeps any text already entered, and never closes or saves on its own

### Requirement: Lyrics can be searched on the web and pasted

The system SHALL offer a `Search the web` action in the lyrics editor that opens the system browser on a web search for the Title and Artist shown in the editor followed by `lyrics`, and SHALL accept pasted text in the lyrics field without altering it beyond normalization on save.

#### Scenario: Search the web from the editor

- **WHEN** a user edits Title to `Mezmerize`, Artist to `System of a Down`, and taps `Search the web`
- **THEN** the system browser opens a search for `Mezmerize System of a Down lyrics` and the editor keeps its state

#### Scenario: Paste lyrics

- **WHEN** a user pastes text into the lyrics field and presses `Save`
- **THEN** the pasted text is stored as the track's lyrics after normalization

### Requirement: Loops and adjusted tracks show their parent track's lyrics

The system SHALL resolve the lyrics of a loop, an adjusted track, or a loop of an adjusted track to the saved track that owns them, SHALL NOT store a separate copy on the derived item, and SHALL say which track's lyrics are being shown or edited. Removing a track SHALL remove its lyrics, and a derived item whose owning track no longer exists SHALL show no lyrics.

#### Scenario: A loop shows its track's lyrics

- **WHEN** a loop of a track that has lyrics is playing
- **THEN** the playback Lyrics section shows that track's lyrics

#### Scenario: An adjusted track shares its source's lyrics

- **WHEN** an adjusted copy of a track that has lyrics is playing
- **THEN** the Lyrics section shows the source track's lyrics, and editing them from there updates the source track

#### Scenario: The editor names the owning track

- **WHEN** a user opens the editor while a loop or adjusted track is playing
- **THEN** the editor subtitle reads `Lyrics for <track name>`

#### Scenario: Removing a track removes its lyrics

- **WHEN** a user removes a saved track from the library
- **THEN** its lyrics are removed with it and its loops show no lyrics
