## ADDED Requirements

### Requirement: Users can save named loops from a source track

The system SHALL allow a user to define a start marker and end marker on a playable source track and save that range as a named loop.

#### Scenario: Save a named loop

- **WHEN** a user sets valid start and end markers on a playable source track and provides a loop name
- **THEN** the system saves a named loop that can be played directly without redefining the markers

#### Scenario: Reject an invalid loop range

- **WHEN** a user attempts to save a loop whose end marker is not after its start marker
- **THEN** the system prevents the loop from being saved and explains that the selected range is invalid

### Requirement: Tracks and loops can both be used as playlist items

The system SHALL allow a user to add either a full source track or a saved loop to a playlist as a playable item.

#### Scenario: Add a full track to a playlist

- **WHEN** a user adds a playable source track to a playlist
- **THEN** the playlist contains that track as an item that plays from the beginning of the source through its full duration

#### Scenario: Add a saved loop to a playlist

- **WHEN** a user adds a saved loop to a playlist
- **THEN** the playlist contains that loop as an item that plays only within the saved marker range

### Requirement: Playlist playback supports rehearsal-oriented queue control

The system SHALL play playlist items in sequence and support repeat and shuffle modes suitable for rehearsal practice.

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
