## ADDED Requirements

### Requirement: A recording alone can be exported to the device or to a new Drive file
The system SHALL let the user export a recording, without any background track, as a WAV file either downloaded to the device or created in a Drive folder the user chooses, and SHALL write nothing to Drive until the user confirms the folder and name.

#### Scenario: Download the recording
- **WHEN** the user chooses `Export recording only` and `Download`
- **THEN** a WAV file containing only the recording's audio is saved to the device without any Drive permission or network use

#### Scenario: Export to Drive
- **WHEN** the user chooses `Save to Drive`, picks a folder, and confirms
- **THEN** a new WAV file containing only the recording's audio is uploaded to that folder under the confirmed name

#### Scenario: Cancel before confirming
- **WHEN** the user leaves the dialog before confirming
- **THEN** nothing is uploaded

#### Scenario: Name defaults from the metadata
- **WHEN** the dialog opens
- **THEN** the name defaults to the recorded track name and the recording name, and the user can edit it

### Requirement: A mix of the recording over the original track can be exported to the device or to a new Drive file
The system SHALL let the user export a mix, by download or as a new Drive file, as a WAV file that reproduces what the singer heard while recording: the original track as it played during the recording, including its speed, pitch shift, pauses, seeks, loop passes, and punch range, with the recording mixed in at the chosen balance, with its compensation and nudge, and unshaped. It SHALL be built from the recording's metadata and the original audio fetched through the normal track path.

#### Scenario: Recording over a slowed track
- **WHEN** a recording was made against a track at 0.7× and the user exports a mix
- **THEN** the file plays the track at 0.7× with the recording aligned to it, in the order and timing it was recorded

#### Scenario: Loop recording
- **WHEN** a three-pass loop recording is exported as a mix
- **THEN** the file contains the loop's range three times, each with its own pass of the recording

#### Scenario: Balance
- **WHEN** the user sets the balance in the export dialog
- **THEN** the exported mix uses that balance

#### Scenario: Track edited since
- **WHEN** the track's markers and loops changed after recording and its audio still matches
- **THEN** the mix is the same as it would have been at recording time

#### Scenario: Original changed
- **WHEN** the original's content version differs from the one the recording was made against
- **THEN** the dialog warns that the mix may not align and goes ahead only if the user confirms

#### Scenario: Original unavailable
- **WHEN** the original cannot be fetched
- **THEN** the dialog says why the mix is unavailable and still offers the recording alone

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
- **THEN** the system names the reason, the recording is unchanged, and the user can try again

### Requirement: Recordings can be exported to Drive automatically, as a setting
The system SHALL offer a setting, off by default, to copy each new recording to Drive automatically. Turning it on SHALL ask for the Drive write permission once, offer a dedicated folder (default `Choir Recordings`, created if missing, or any folder the user picks), and let the user choose to export the recording only, the mix, or both. The save sheet SHALL show whether auto-export is on and what will be uploaded.

#### Scenario: Turning it on
- **WHEN** the user turns on auto-export in Settings
- **THEN** the system requests the write permission, shows the folder `Choir Recordings` with a way to change it, and shows the choice of recording only, mix, or both

#### Scenario: Default off
- **WHEN** the user records without changing settings
- **THEN** nothing is uploaded automatically and the save sheet offers `Turn on auto-export`

#### Scenario: Export after saving
- **WHEN** auto-export is on with `Both` and a recording is saved
- **THEN** the recording alone and the mix are uploaded to the chosen folder in the background without blocking the user

#### Scenario: Offline or signed out
- **WHEN** there is no connection or Drive session when a recording is saved
- **THEN** the exports wait as pending and run when both are available

#### Scenario: Mix cannot be built
- **WHEN** the original track cannot be fetched for a mix
- **THEN** the mix is marked failed with the reason and the recording alone is still uploaded

### Requirement: Each recording shows its export status and exports are not repeated or undone
The system SHALL show for each recording whether it is on Drive, pending, or failed, with a way to retry a failure, SHALL NOT upload the same kind of export twice for a recording, and SHALL NOT delete Drive copies when a recording is deleted or renamed.

#### Scenario: Status
- **WHEN** a recording's exports have completed
- **THEN** its row shows `On Drive`

#### Scenario: Retry
- **WHEN** an export failed
- **THEN** the row shows `Upload failed` with the reason and a `Retry`

#### Scenario: No duplicates
- **WHEN** a recording already has a recording-only export and the setting is `Both`
- **THEN** only the missing mix is uploaded

#### Scenario: Back up existing
- **WHEN** the user chooses `Back up existing recordings`
- **THEN** recordings with missing exports are queued under the current settings
