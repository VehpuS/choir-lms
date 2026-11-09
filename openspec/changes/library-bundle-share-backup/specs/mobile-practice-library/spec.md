## ADDED Requirements

### Requirement: Writing bundles asks for the narrowest write permission

The system SHALL write bundles using only the `drive.file` scope together with the existing read-only scope, SHALL check the scope the session holds before the first write, SHALL NOT request a broader write scope, and SHALL NOT require the write scope to read or import a bundle.

#### Scenario: Read-only session

- **WHEN** a session that holds only the read-only scope starts a backup or share
- **THEN** the flow shows `Allow saving to Drive` and nothing is written

#### Scenario: Importing works with read access

- **WHEN** a session that holds only the read-only scope imports a bundle
- **THEN** the import runs without a permission prompt

### Requirement: Source availability can report that access is needed

The system SHALL represent a source the user cannot currently open because it has not been shared with them as unavailable with the reason `needs-access`, distinct from `access-revoked` and `missing`, and SHALL treat it as repairable by obtaining access rather than by reconnecting a moved file.

#### Scenario: Distinct reason

- **WHEN** an imported source's file cannot be opened
- **THEN** its availability reason is `needs-access`
- **AND** it is not reported as `access-revoked`

#### Scenario: Playback is blocked with a clear message

- **WHEN** a user tries to play a `needs-access` source
- **THEN** playback does not start
- **AND** the message says the file cannot be opened and needs to be shared by its owner
