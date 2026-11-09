## ADDED Requirements

### Requirement: Imported folders and items are ordinary library entities

The system SHALL treat folders and items created by an import as ordinary Files entities that can be renamed, moved, tagged, copied and deleted like any other, and SHALL show `Imported from <author>` on the import's root folder.

#### Scenario: Imported items are editable

- **WHEN** a user renames, moves or deletes an imported folder or item
- **THEN** the operation behaves as it does for any library item

#### Scenario: Deleting the import folder removes only the import

- **WHEN** a user deletes the import's root folder
- **THEN** the items created by the import are removed according to the existing delete rules
- **AND** sources that were reused from the existing library are kept

### Requirement: A source that needs access recovers when access arrives

The system SHALL show a source marked `needs-access` as unavailable with the message that the file cannot be opened and needs to be shared by its owner, SHALL offer `Open in Drive` and `Remove from library` for it, and SHALL make it available again, with its metadata, loops and links intact, when a later check can open the file.

#### Scenario: Needs-access row

- **WHEN** a source is marked `needs-access`
- **THEN** its row shows that it cannot be opened until the owner shares it
- **AND** the row offers `Open in Drive` and `Remove from library`

#### Scenario: Recovery keeps relationships

- **WHEN** access is granted and a check succeeds
- **THEN** the source becomes available
- **AND** its loops, playlist entries and file links are unchanged
