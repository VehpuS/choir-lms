## ADDED Requirements

### Requirement: The whole library can be backed up to Drive

The system SHALL let a user back up the whole library by writing a bundle to a `Backups` folder inside a `Choir LMS` folder the app creates in the user's Drive. Each backup SHALL be a separate dated file. The system SHALL write nothing to Drive until the user confirms, and SHALL need no scope beyond `drive.file` to do so.

#### Scenario: First backup creates the folders

- **WHEN** a user confirms a backup and the `Choir LMS/Backups` folder does not exist
- **THEN** the folders are created and the backup is written inside as a dated file

#### Scenario: Backup without write permission

- **WHEN** the session lacks the `drive.file` scope
- **THEN** the flow shows `Allow saving to Drive` and nothing is written
- **AND** accepting starts sign-in with the write scope

#### Scenario: Backup failure leaves nothing half-written

- **WHEN** the upload is cancelled, offline or fails
- **THEN** no partial backup file remains listed as a backup
- **AND** the user can try again

### Requirement: Older backups are pruned to a limit

The system SHALL keep the most recent backups up to a limit (default 5) and SHALL remove older ones only after a new backup finishes, SHALL remove only files the app created in `Backups`, and SHALL NOT remove a pre-restore backup before its restore has committed.

#### Scenario: Sixth backup removes the oldest

- **WHEN** a sixth backup finishes with the limit at 5
- **THEN** the oldest backup is removed from `Backups`

#### Scenario: A failed backup removes nothing

- **WHEN** a new backup fails
- **THEN** no earlier backup is removed

#### Scenario: Files the app did not create are never removed

- **WHEN** `Backups` contains a file the app did not create
- **THEN** pruning leaves it in place

### Requirement: Backups can be listed and opened

The system SHALL list the user's backups, newest first, showing date, size and counts, and SHALL let the user open one to import or restore it.

#### Scenario: Backups are listed

- **WHEN** a user opens Restore
- **THEN** their backups are listed newest first with date and counts

#### Scenario: No backups

- **WHEN** no backup exists
- **THEN** Restore says so and offers `Back up now`

### Requirement: Restoring a backup is either an additive import or a replace

The system SHALL ask the user, when they open one of their backups, to choose `Add to my library` or `Replace my library`. `Add to my library` SHALL follow the additive import requirements. Nothing SHALL change until the user has chosen and confirmed.

#### Scenario: The choice is offered

- **WHEN** a user opens a backup to restore it
- **THEN** both `Add to my library` and `Replace my library` are offered
- **AND** neither is preselected

#### Scenario: Add keeps the existing library

- **WHEN** a user chooses `Add to my library`
- **THEN** the backup is imported into a new folder and nothing existing is changed

### Requirement: Replace writes a pre-restore backup first and commits once

The system SHALL, before replacing the library, write a pre-restore backup that includes every recording, and SHALL stop with the library unchanged if that backup is not written. It SHALL then build the replacement state and commit it in one swap, so the library is never left half-replaced, and SHALL recover or finish an interrupted swap the next time the library loads. The pre-restore backup SHALL stay in `Backups` after the restore, and the user SHALL be told where it is.

#### Scenario: Pre-restore backup fails

- **WHEN** the pre-restore backup cannot be written
- **THEN** the restore stops and the library is unchanged
- **AND** the user is told why

#### Scenario: Replace commits after the backup

- **WHEN** the pre-restore backup is written and the user has confirmed
- **THEN** the library becomes the bundle's contents in one swap
- **AND** the user is shown the pre-restore backup as the way to undo

#### Scenario: Interrupted replace is finished safely

- **WHEN** the app is closed after the swap began but before it finished
- **THEN** the next load finishes the swap or restores the previous state
- **AND** the library is never half old and half new

#### Scenario: Undo is a restore

- **WHEN** a user opens the pre-restore backup and chooses `Replace my library`
- **THEN** the library returns to its state before the first restore

#### Scenario: Confirmation names what is lost

- **WHEN** the user is asked to confirm Replace
- **THEN** the dialog says the library will be replaced, how many items and recordings are in the backup, and that a backup of the current library is saved first
