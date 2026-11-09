## ADDED Requirements

### Requirement: A library folder can be shared as a bundle

The system SHALL let a user share a library folder by writing a bundle of it to a `Shares` folder inside the `Choir LMS` folder in their Drive. The system SHALL NOT change Drive permissions or request a broader scope, and SHALL tell the user to share the bundle (or the `Shares` folder) in Drive and that the people they share with also need access to the audio files.

#### Scenario: Share a folder

- **WHEN** a user chooses `Share` on a library folder, reviews the preview and confirms
- **THEN** a bundle of that folder and its dependents is written to `Choir LMS/Shares`
- **AND** the user is shown a way to open the bundle in Drive to share it

#### Scenario: The app does not change permissions

- **WHEN** a share is written
- **THEN** no permission on the bundle or on any audio file is created or changed by the app

#### Scenario: Share preview

- **WHEN** a user reviews a share
- **THEN** the preview shows counts of tracks, loops, playlists and composites, the references left out, and the recordings choice

### Requirement: Bundles shared with the user can be found

The system SHALL list bundles from the user's own `Choir LMS` folders and from `Shared with me`, identified by the app's marker on the file with a file-name fallback, and SHALL read them with the read-only scope.

#### Scenario: A shared bundle is listed

- **WHEN** another user shares a bundle with the user
- **THEN** it appears in the import list with its name, author and date

#### Scenario: Importing needs no write permission

- **WHEN** a user whose session has only read access imports a bundle
- **THEN** the import proceeds without asking for write permission

#### Scenario: Marker missing

- **WHEN** a shared bundle lost its marker but its name matches the bundle pattern
- **THEN** it is still listed

### Requirement: Import is additive and shows a preview first

The system SHALL import a bundle only by adding to the library: it SHALL create a new folder named for the bundle and date under a destination the user chooses, recreate the bundle's folders inside it, and create new loops, playlists, composites and adjusted tracks with new ids. It SHALL show a preview of what will be added, reused and dropped before changing anything, and SHALL NOT modify or delete any existing folder, file link or entity other than adding tags to a reused source.

#### Scenario: Preview before changes

- **WHEN** a user opens a bundle to import it
- **THEN** a preview shows counts of new tracks, reused tracks, loops, playlists, composites, items dropped as damaged, and files that need access
- **AND** nothing has been written to the library

#### Scenario: Import lands in a new folder

- **WHEN** the user confirms
- **THEN** a new folder `Imported <name> <date>` is created at the chosen destination holding the bundle's structure
- **AND** existing folders and items are unchanged

#### Scenario: Name conflicts are resolved by the placement rules

- **WHEN** the bundle's names collide with each other or with the destination's
- **THEN** names are made unique the same way copy conflicts are

#### Scenario: Import can be retried

- **WHEN** an import fails part way
- **THEN** what was written is a valid library and a retry reuses the sources already created instead of duplicating them

### Requirement: A matching source is reused

The system SHALL reuse an existing library source when a bundle source has the same `driveFileId`, SHALL add the bundle source's tags to it, and SHALL fill its lyrics, sheet music and markers only where it has none. Loops, playlists, composites and adjusted tracks from the bundle SHALL point at the reused source.

#### Scenario: Same file, existing source

- **WHEN** the bundle's source and an existing source share a `driveFileId`
- **THEN** no second source is created
- **AND** imported loops and playlist entries point at the existing source

#### Scenario: Tags merge

- **WHEN** the bundle's source has tags the existing source lacks
- **THEN** those tags are added and none are removed

#### Scenario: Existing content is kept

- **WHEN** the existing source already has lyrics and markers
- **THEN** the imported lyrics and markers are not applied over them

### Requirement: Import never waits on access to the audio

The system SHALL import sources the user cannot open using the bundle's own name, duration and size, and SHALL mark them with the availability reason `needs-access`. The system SHALL probe each source with bounded concurrency and SHALL allow the import to be cancelled.

#### Scenario: Unreachable file still imports

- **WHEN** a bundle source's file cannot be opened by the user
- **THEN** the source is imported with the bundle's metadata and marked as needing access
- **AND** its loops, playlists and folder placement are imported normally

#### Scenario: Reachable file looks normal

- **WHEN** a source's file can be opened
- **THEN** it imports as available with Drive's current metadata

### Requirement: The user is guided to get missing access

The system SHALL, when imported sources need access, show a guide that groups them by owner and offers `Open in Drive`, `Email owner`, `Copy list` and `Check again`. The copy SHALL say the file cannot be opened and the owner needs to share it, and SHALL NOT claim the cause is permissions, because Drive reports a missing file and an unshared file the same way. The system SHALL NOT attempt to request access itself.

#### Scenario: Grouped by owner

- **WHEN** needs-access sources have different owners
- **THEN** the guide lists one group per owner with the file names
- **AND** sources with no recorded owner are grouped under the bundle's author

#### Scenario: Open in Drive

- **WHEN** a user chooses `Open in Drive` for a file
- **THEN** Drive's file page opens, where Drive offers its own Request access

#### Scenario: Email owner

- **WHEN** a user chooses `Email owner` for a group
- **THEN** a message opens addressed to that owner listing the file names and links

#### Scenario: Copy list

- **WHEN** a user chooses `Copy list`
- **THEN** the names and links are copied as text

#### Scenario: Check again

- **WHEN** a user chooses `Check again` after being given access
- **THEN** the sources are probed again and the ones now reachable become available
- **AND** the others remain listed

#### Scenario: Shared folder hint

- **WHEN** many needs-access sources share one original Drive folder recorded in the bundle
- **THEN** the guide names that folder so one request can cover them
