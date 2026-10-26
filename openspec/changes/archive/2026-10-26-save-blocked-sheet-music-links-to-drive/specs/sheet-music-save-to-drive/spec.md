## ADDED Requirements

### Requirement: A sheet music file can be saved to Drive and used from there

The system SHALL let a user copy a sheet music file into their Google Drive from the web build, either from a link source the browser cannot read, or from a file on their device, by choosing the file themselves and a destination folder, and SHALL then use the Drive copy as the source. The system SHALL NOT fetch the blocked site itself, SHALL NOT store the file anywhere except the chosen Drive folder, and SHALL write nothing to Drive until the user confirms the destination.

#### Scenario: A blocked link offers Save to Drive

- **WHEN** a web link source fails because its host does not allow browser requests
- **THEN** the failure card offers `Save to Drive` and `Open in browser`
- **AND** no request for the file contents was made by the app other than the one that failed

_Verified in the web preview (task 5.4): an `example.org` PDF link showed `Save to Drive` and `Open in browser`._

#### Scenario: Save a blocked link

- **WHEN** a user taps `Save to Drive`, opens the link in the browser, downloads the file, chooses it, and picks a destination folder
- **THEN** the file is uploaded to that folder under its own file name
- **AND** the source keeps its label and part selection and now points at the Drive file
- **AND** the viewer opens the Drive copy

_Verified in the web preview with the user's Drive (task 5.4): after choosing a file and a folder the source kept its id and label, pointed at the Drive file, and the viewer rendered it. Saved twice, from the failure card and from the row menu._

#### Scenario: Save from the device

- **WHEN** a user chooses `From this device` while adding sheet music and picks a PDF, MusicXML, or MIDI file
- **THEN** the file is uploaded to the chosen Drive folder and added as a new Drive source for the track
- **AND** the track's source limit still applies

_Verified in the web preview (task 5.4): `From this device` added a Drive source labelled from the file name, and the viewer opened on it. The folder step opened at the track's own Drive folder. The source limit is covered by the manager's existing limit check, not exercised live._

#### Scenario: The chosen file is not sheet music

- **WHEN** the chosen file is not a readable PDF, MusicXML, or MIDI file, or is over 25 MB
- **THEN** nothing is uploaded and the user is told why

_Covered by specs (`device-file-model.spec.ts`, `save-flow-panel.spec.tsx`); the refusal message was not observed live._

#### Scenario: Cancel or fail

- **WHEN** the user cancels, goes offline, or the upload fails
- **THEN** the source is unchanged and no partial source is added
- **AND** the user can try again

_Verified in the web preview (task 5.4) for cancel: the upload request was aborted, the source was unchanged, and the sheet returned to the folder step with the file kept. Offline and other failures are covered by specs only._

#### Scenario: Removed while uploading

- **WHEN** the source being replaced is removed before the upload finishes
- **THEN** the source is not added back

_Covered by specs only (`use-save-to-drive.spec.ts`, `source-sheet-music-storage.spec.ts`); not exercised live._

### Requirement: Saving to Drive asks for the narrowest extra permission

The system SHALL request the `drive.file` scope together with the existing read-only scope (`drive.readonly`) when the user signs in to Drive, SHALL NOT request any broader write scope, and SHALL check the scope the session actually holds before the first write. Reading Drive files SHALL NOT depend on the write scope.

#### Scenario: Existing session without the write scope

- **WHEN** a user whose session was granted only read access taps `Save to Drive`
- **THEN** the flow shows `Allow saving to Drive` and nothing is uploaded
- **AND** tapping it starts sign-in with both scopes

_Verified in the web preview (task 5.4) by removing `drive.file` from the stored session scope: the sheet showed only `Allow saving to Drive`. Tapping it (the sign-in) was not exercised in this run._

#### Scenario: Write scope granted

- **WHEN** the granted scope includes `drive.file`
- **THEN** the flow goes straight to choosing the file and folder

_Verified in the web preview (task 5.4): with `drive.file` granted the sheet went straight to the file and folder steps._

#### Scenario: Permission declined

- **WHEN** the user finishes sign-in without granting `drive.file`
- **THEN** the flow says saving needs that permission and stays on `Allow saving to Drive`
- **AND** browsing, searching, and viewing Drive sources keep working

#### Scenario: Access revoked after sign-in

- **WHEN** an upload is refused as not permitted
- **THEN** the flow returns to `Allow saving to Drive` and nothing is changed
