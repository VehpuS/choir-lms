## ADDED Requirements

### Requirement: A bare recording can be exported to the device or to a new Drive file
The system SHALL let the user export a take, without any background track, as a WAV file either downloaded to the device or created in a Drive folder the user chooses, and SHALL write nothing to Drive until the user confirms the folder and name.

#### Scenario: Download the recording
- **WHEN** the user chooses `Export recording` and `Download`
- **THEN** a WAV file containing only the take's audio is saved to the device without any Drive permission or network use

#### Scenario: Export the recording
- **WHEN** the user chooses `Export recording`, picks a folder, and confirms
- **THEN** a new WAV file containing only the take's audio is uploaded to that folder under the confirmed name

#### Scenario: Cancel before confirming
- **WHEN** the user leaves the dialog before confirming
- **THEN** nothing is uploaded

#### Scenario: Name defaults from the snapshot
- **WHEN** the dialog opens
- **THEN** the name defaults to the recorded track name and the take name, and the user can edit it

### Requirement: A mixdown of the take over the original track can be exported to the device or to a new Drive file
The system SHALL let the user export a mixdown, by download or as a new Drive file, as a WAV file that reproduces what the singer heard while recording: the original track as it played during the take, including its speed, pitch shift, pauses, seeks, loop passes, and punch range, with the take mixed in at the chosen balance, the take's compensation and nudge, and the take unshaped.

#### Scenario: Take over a slowed track
- **WHEN** a take was recorded against a track at 0.7× and the user exports a mixdown
- **THEN** the file plays the track at 0.7× with the take aligned to it, in the order and timing it was recorded

#### Scenario: Loop take
- **WHEN** a three-pass loop take is exported as a mixdown
- **THEN** the file contains the loop's range three times, each with its own pass of the take

#### Scenario: Balance
- **WHEN** the user sets the balance in the export dialog
- **THEN** the exported mix uses that balance

#### Scenario: Independent of later track changes
- **WHEN** the track is edited or its markers and loops change after recording and the original audio still matches the stored content version
- **THEN** the mixdown is the same as it would have been at recording time

#### Scenario: Original replaced on Drive
- **WHEN** the live track was replaced or deleted after the take was saved with its original kept
- **THEN** the mixdown uses the kept copy and is the same as it would have been at recording time

#### Scenario: No kept copy
- **WHEN** the take has no kept copy of the original and the live track no longer matches the snapshot
- **THEN** the dialog says why the mixdown is unavailable and still offers the bare recording

### Requirement: Drive exports ask for write permission only when needed and report their outcome
The system SHALL request the Drive write permission only when the user confirms an export to Drive, and SHALL show progress, allow cancel, and report the result or the failure reason (missing permission, quota, folder not writable, offline, or other) without leaving a partial file recorded as a success.

#### Scenario: Missing permission
- **WHEN** the session lacks the write scope at confirmation
- **THEN** the system asks for it, and exports only after it is granted

#### Scenario: Large file
- **WHEN** the file is larger than the single-request limit
- **THEN** it is uploaded in resumable chunks with visible progress

#### Scenario: Interrupted upload
- **WHEN** the connection drops during an upload
- **THEN** the export can be retried and resumes from the last uploaded chunk

#### Scenario: Success
- **WHEN** the upload completes
- **THEN** the system shows the file name and folder it was saved to

#### Scenario: Failure
- **WHEN** the upload fails
- **THEN** the system names the reason, the take is unchanged, and the user can try again
