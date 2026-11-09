## ADDED Requirements

### Requirement: A library bundle is a versioned, self-contained snapshot

The system SHALL represent a snapshot of the library as one JSON bundle holding a `formatVersion`, creation time, author, scope, and the sources (by `driveFileId`), library folders, file links, loops, playlists, composites and adjusted tracks in scope, with their tags, lyrics, sheet music links, markers and original-location hints. A bundle SHALL use bundle-local ids for every entity and every cross reference, SHALL NOT contain audio, and SHALL NOT contain device ids or credentials.

#### Scenario: Whole-library bundle

- **WHEN** a bundle is built for the whole library
- **THEN** it contains every source, folder, file link, loop, playlist, composite and adjusted track
- **AND** its scope is the whole library

#### Scenario: References are rewritten to bundle-local ids

- **WHEN** a bundle is built
- **THEN** every loop, playlist entry, composite stem and file link refers to an entity by a bundle-local id that exists in the same bundle
- **AND** none of the library's own storage ids appear in the bundle

#### Scenario: Per-source owner is recorded when known

- **WHEN** Drive reports an owner for a source's file at export
- **THEN** the bundle records that owner's name and email for the source
- **AND** a source with no reported owner is exported without one

### Requirement: Bundles are parsed once, tolerantly, at the boundary

The system SHALL parse and validate a bundle at the point it is read, before anything is planned or stored. The parser SHALL ignore unknown fields, SHALL drop malformed entities and entities with references that do not resolve inside the bundle and count them, and SHALL refuse a bundle whose `formatVersion` is newer than the app supports. Older versions SHALL be upgraded to the current shape.

#### Scenario: Unknown fields are ignored

- **WHEN** a bundle carries fields the app does not know
- **THEN** the bundle is read and the unknown fields are ignored

#### Scenario: Damaged entities are dropped and counted

- **WHEN** a bundle contains a loop whose source is not in the bundle
- **THEN** that loop is dropped
- **AND** the preview reports the number of dropped items

#### Scenario: A newer bundle is refused

- **WHEN** a bundle's `formatVersion` is greater than the app's
- **THEN** nothing is read beyond the version
- **AND** the user is told to update the app

#### Scenario: Not a bundle

- **WHEN** the chosen file is not valid JSON or is not a bundle
- **THEN** it is refused with a message saying it is not a Choir LMS bundle

### Requirement: A folder bundle includes the dependents of its contents

The system SHALL, when building a bundle for a library folder, include the folder's subtree, the loops and adjusted tracks owned by its tracks, and the playlists and composites that refer to its tracks. References from an included playlist or composite to items outside the folder SHALL be removed and counted, and the count SHALL be shown before anything is written.

#### Scenario: Loops and adjusted tracks travel with their track

- **WHEN** a folder containing a track is exported
- **THEN** that track's loops and adjusted tracks are in the bundle even if they live in other folders

#### Scenario: Outside references are left out and counted

- **WHEN** an exported playlist also holds a track from outside the folder
- **THEN** the playlist is exported with only its in-folder entries
- **AND** the export preview shows how many references were left out

#### Scenario: Composite with missing stems

- **WHEN** a composite's stems are only partly inside the folder
- **THEN** the composite is exported with its in-folder stems and the outside stems reported as left out

### Requirement: Recording audio is included only when chosen

The system SHALL leave recordings out of a bundle unless the user selects them. For a selected recording whose audio already has a Drive copy, the bundle SHALL reference that copy rather than uploading the audio again. The system SHALL show the total size of audio that would be uploaded before anything is uploaded.

#### Scenario: Recordings are off by default

- **WHEN** a user starts a backup or a share
- **THEN** no recording is selected

#### Scenario: Selected recording already on Drive

- **WHEN** a selected recording already has a recording copy on Drive
- **THEN** the bundle references that copy and uploads no audio for it

#### Scenario: Selected recording not on Drive

- **WHEN** a selected recording has no Drive copy
- **THEN** its audio is uploaded beside the bundle and referenced from it
- **AND** the selection step showed the upload size first

### Requirement: Imported items record where they came from

The system SHALL mark the folder an import creates, and every entity it creates, with the bundle's author and name and the time of import. Reusing an existing source SHALL NOT change that source's own provenance.

#### Scenario: Import root shows its origin

- **WHEN** a bundle is imported
- **THEN** the new import folder shows `Imported from <author>` in Files

#### Scenario: Reused source keeps its provenance

- **WHEN** an imported source matches an existing source
- **THEN** the existing source is not marked as imported
