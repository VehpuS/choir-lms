## ADDED Requirements

### Requirement: Users can save named loops from a saved source track

The system SHALL allow a user to define a start marker and end marker on a saved playable source track and save that range as a named loop.

#### Scenario: Save a named loop

- **WHEN** a user sets valid start and end markers on a saved playable source track and provides a loop name
- **THEN** the system saves a named loop that can be played directly without redefining the markers

#### Scenario: Loop creation opens from a saved track

- **WHEN** a user chooses to make a loop from a saved rehearsal library track
- **THEN** the system opens a dedicated loop-creation surface for that track instead of keeping a persistent inline builder visible in the library

#### Scenario: Users define loop boundaries with a dual-thumb range slider

- **WHEN** a user adjusts the loop-creation range slider
- **THEN** the system updates the proposed start and end boundaries from the two thumb positions, keeps visible time labels for the selected range, and preserves the selected track and range summary before save

#### Scenario: Reject an invalid loop range

- **WHEN** a user attempts to save a loop whose end marker is not after its start marker
- **THEN** the system prevents the loop from being saved and explains that the selected range is invalid

### Requirement: Playlist membership persists through ordered playlist entries

The system SHALL persist playlist membership through app-owned ordered playlist-entry relationships between a playlist and a saved rehearsal item so saved tracks and saved loops can participate in many-to-many playlist assignments while each playlist keeps its own explicit sort order.

#### Scenario: Add to an existing playlist creates an ordered membership

- **WHEN** a user completes `assignToExistingPlaylist` for a saved track or saved loop
- **THEN** the system creates a playlist-entry relationship at the next available index in the selected playlist without duplicating the underlying saved item

#### Scenario: Create a playlist during add flow also creates the first membership

- **WHEN** a user completes `createNewPlaylist` with a `PlaylistName` during playlist assignment
- **THEN** the system creates the playlist and its first ordered playlist-entry relationship for the selected saved item

#### Scenario: A saved item can belong to multiple playlists with independent order

- **WHEN** the same saved track or saved loop is added to more than one playlist
- **THEN** each playlist stores its own explicit index values for that item's playlist entries without affecting the ordering of any other playlist

#### Scenario: Save reordered playlist indexes

- **WHEN** a user completes `saveEdits` after running `updateTrackIndex`
- **THEN** the system persists the updated index array for that playlist's entries and leaves the order of other playlists unchanged

#### Scenario: Remove a playlist membership without deleting the source item

- **WHEN** a user runs `removeFromPlaylist` for an item in a playlist
- **THEN** the system removes only that playlist-entry relationship and keeps the underlying saved track or saved loop available in the rehearsal library and any other playlists

### Requirement: Saved tracks and loops can both be used as playlist items

The system SHALL allow a user to add either a saved full source track or a saved loop to a playlist as a playable item.

#### Scenario: Add a saved full track to a playlist

- **WHEN** a user adds a saved playable source track to a playlist
- **THEN** the playlist contains that track as an item that plays from the beginning of the source through its full duration

#### Scenario: Add a saved loop to a playlist

- **WHEN** a user adds a saved loop to a playlist
- **THEN** the playlist contains that loop as an item that plays only within the saved marker range

#### Scenario: Add the same saved rehearsal item more than once

- **WHEN** a user adds the same saved track or saved loop to a playlist multiple times
- **THEN** the playlist preserves each insertion as a separate queue item and playback keeps each occurrence in its own ordered or shuffled position

### Requirement: Playlist playback supports rehearsal-oriented queue control

The system SHALL play playlist items in sequence and support repeat and shuffle modes suitable for rehearsal practice.

#### Scenario: Start playback from a selected playlist position

- **WHEN** a user taps a track or loop row within a playlist detail view
- **THEN** the system starts playback from that row's persisted playlist index and queues the remaining items from that same playlist in order after it

#### Scenario: Ordered playlist playback

- **WHEN** a user starts playback of a playlist with shuffle disabled
- **THEN** the system plays the playlist items in their saved order

#### Scenario: Shuffle playlist playback

- **WHEN** a user starts playback of a playlist with shuffle enabled
- **THEN** the system plays playlist items in a shuffled order for that playback session

#### Scenario: Repeat playlist playback

- **WHEN** a user enables playlist repeat during playback
- **THEN** the system continues playback according to the selected repeat behavior instead of stopping at the last item

#### Scenario: Repeat track playback

- **WHEN** a user enables repeat for a single track or loop during playback
- **THEN** the system continues to repeat that item instead of advancing to the next playlist item until the user disables repeat or advances manually

### Requirement: Mobile playback integrates with native transport surfaces

The system SHALL expose the active playback session through supported native mobile transport surfaces for the MVP platform.

#### Scenario: Background playback remains controllable

- **WHEN** a user sends the app to the background during active playback
- **THEN** the system keeps the playback session controllable through supported native transport controls

#### Scenario: Native transport controls affect the active queue

- **WHEN** a user uses a supported native transport control such as play, pause, next, or previous
- **THEN** the system applies that command to the active rehearsal playback queue

## Manual Regression Checklist

- [ ] Create a loop from a saved track by capturing markers from playback, then verify invalid ranges are blocked with inline guidance.
- [ ] Add saved tracks and loops to a playlist, including adding the same item more than once, and confirm duplicate entries keep distinct queue positions.
- [ ] Reorder playlist items, save edits, reopen the playlist, and verify persisted index order is preserved.
- [ ] Start playback from a tapped playlist row and verify ordered mode, shuffle mode, and repeat modes (`off`, `one`, `all`) behave as expected.
- [ ] Confirm background and lock-screen transport controls (play/pause/next/previous) continue to control the active rehearsal queue.
