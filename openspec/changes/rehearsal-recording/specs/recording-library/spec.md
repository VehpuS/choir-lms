## ADDED Requirements

### Requirement: Recordings are children of their owner and are not library files
The system SHALL keep recordings as children of the track, adjusted track, or loop they were made on, like markers and lyrics, and SHALL NOT list them in the Files tree or in track search results or treat them as tracks. They SHALL appear in the places this specification names.

#### Scenario: Track search
- **WHEN** the user searches the library for a recording's name
- **THEN** no track result is returned for the recording

#### Scenario: Files tree
- **WHEN** the user browses the Files tree
- **THEN** recordings are not listed

### Requirement: The Recordings panel is opened from the playback overflow and works whether or not the Recording tool is on
The system SHALL provide a `Recordings` action in the playback screen's `More actions` menu that opens a panel listing the recordings for the open track, without a top-level button or count badge. The action SHALL be available when the Recording tool is off and SHALL show a muted count in the menu row.

#### Scenario: Tool off
- **WHEN** the Recording tool is off and the open track has recordings
- **THEN** `Recordings` in `More actions` opens the panel and the playback header shows no recordings button or badge

#### Scenario: No recordings
- **WHEN** the open track has no recordings
- **THEN** the panel opens and explains how to record

### Requirement: A track lists its own recordings and, in a Loops section, its loops' recordings
The system SHALL list in a track's main section only recordings made on the track itself (whole track and segments, including recordings made over unsaved adjustments), and SHALL list recordings made on its loops only in a `Loops` section grouped by loop.

#### Scenario: Loop recording on a track
- **WHEN** a recording was made on the "Chorus" loop of a track
- **THEN** it appears under the "Chorus" group of the track's `Loops` section and not in the track's main section

#### Scenario: Segment recording
- **WHEN** a recording covers a punch segment of the track
- **THEN** it appears in the track's main section

### Requirement: A loop lists only the recordings made on it
The system SHALL list in a loop's view only recordings made on that loop, and SHALL make them viewable from the loop's parent track through its `Loops` section.

#### Scenario: Loop view
- **WHEN** the user opens the "Chorus" loop
- **THEN** only recordings made on "Chorus" are listed, and recordings of the whole track or other loops are not

### Requirement: Adjusted tracks and their parents both list the recordings made on the adjusted track
The system SHALL list a recording made on a saved adjusted track under the adjusted track and also under the adjusted track's parent track, labelled with the adjustment, and SHALL list a recording made on a loop of an adjusted track in the adjusted track's `Loops` section, in the parent track's `Loops` section, and in the loop's own view.

#### Scenario: Whole recording on an adjusted track
- **WHEN** a recording was made on a saved adjusted copy at 0.7× and +2
- **THEN** it is listed under the adjusted copy and under the parent track with the label `0.7×, +2`

#### Scenario: Loop recording on an adjusted track
- **WHEN** a recording was made on a loop of an adjusted copy
- **THEN** it appears in the adjusted copy's `Loops` section, in the parent track's `Loops` section, and in the loop's view

#### Scenario: Adjusted copy deleted
- **WHEN** the adjusted copy is deleted
- **THEN** its recordings remain listed under the parent track with their stored adjustment label

### Requirement: The Library has a Recordings view with search, filters, sorting, and bulk actions
The system SHALL provide a Recordings view in the Library listing every recording on the device. It SHALL offer search by recording name, track title, loop name, and marker names in the span; filters for whole track, segment, loop, adjusted, on Drive, not on Drive, original changed, needs a connection for overlay, and a track; and sorting by newest, track, length, and name. Each row SHALL show the name, the track and span, tags, length, size, the Drive export status, and whether the overlay is kept offline. Selecting rows SHALL use the shared multi-selection with the bulk actions `Play next`, `Add to queue`, `Add to playlist`, `Keep overlay offline` or `Remove from offline`, `Export`, and `Delete`.

#### Scenario: Search by marker name
- **WHEN** the user searches for "Chorus"
- **THEN** recordings whose span contains a marker named "Chorus", or whose loop or track is named "Chorus", are listed

#### Scenario: Filter to loops
- **WHEN** the user chooses the `Loop` filter
- **THEN** only loop recordings are listed

#### Scenario: Filter to not on Drive
- **WHEN** the user chooses `Not on Drive`
- **THEN** only recordings with no export to Drive are listed

#### Scenario: Bulk keep overlay offline
- **WHEN** the user selects three recordings and chooses `Keep overlay offline`
- **THEN** their overlay segments are kept and each row shows it

#### Scenario: Open a recording
- **WHEN** the user opens a row
- **THEN** its track opens in the recording's context, locked

#### Scenario: Empty library
- **WHEN** there are no recordings
- **THEN** the view explains how to record

### Requirement: Recordings can be queued and used in playlists
The system SHALL let recordings be added to playlists and to the queue with `Play next`, `Add to queue`, and `Add to playlist` from every recording list, the Library view, and bulk selection. A playlist or queue recording SHALL play in its recorded context over its track, at its saved balance, stop at the end of the recorded range, and then continue with the next item, restoring shaping for that item.

#### Scenario: Add to playlist
- **WHEN** the user chooses `Add to playlist` on a recording and picks a playlist
- **THEN** the playlist lists the recording with its track name, span, and a recording indicator

#### Scenario: Play in a playlist
- **WHEN** a playlist reaches a recording
- **THEN** the track opens in the recording's context, plays the recorded range with the recording, and moves to the next item at the end of the range

#### Scenario: Recording deleted
- **WHEN** a playlist recording has been deleted
- **THEN** it shows as unavailable, is skipped with a message, and the rest of the playlist continues

#### Scenario: Play next
- **WHEN** the user chooses `Play next` on a recording
- **THEN** it is inserted directly after the current item without interrupting playback
