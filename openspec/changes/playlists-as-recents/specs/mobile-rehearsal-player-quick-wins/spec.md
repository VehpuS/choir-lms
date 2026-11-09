## MODIFIED Requirements

### Requirement: Recents provides fast recent rehearsal entry points

The system SHALL provide direct shortcuts to recent rehearsal context so users can restart common practice flows in one step.

#### Scenario: Resume last rehearsal source from Recents

- **WHEN** a user has recent playback history
- **THEN** Recents shows a direct shortcut to resume the most relevant recent rehearsal item or playlist context
- **AND** any direct playback control in that shortcut uses a standard play icon rather than a text-labeled `Play` button

#### Scenario: Recent playback history persists across app sessions

- **WHEN** a user restarts the app after playing one or more rehearsal items
- **THEN** the system restores recent playback history needed to populate Recents
- **AND** Recents does not depend solely on in-memory active playback state to determine whether recent items exist

#### Scenario: Resume controls map to one explicit recent item

- **WHEN** Recents shows a resume row for a recent rehearsal item
- **THEN** the row labels the exact target item title, or the playlist name for a playlist row, that will play
- **AND** the row play icon resumes that labeled item or playlist only (not a generic or ambiguous card-level target)

#### Scenario: Multiple recents are presented as per-item rows

- **WHEN** more than one recent rehearsal item exists
- **THEN** Recents renders a compact recent-items list with one row per item
- **AND** each row exposes its own icon-only play control so users can resume a specific item directly
- **AND** those recent items remain available after app relaunch until replaced or evicted by the recents history policy

#### Scenario: Recent-item overflow includes queue acceleration and library handoff actions

- **WHEN** a user opens the vertical-ellipsis menu on a track, loop or composite recent row
- **THEN** the menu includes `Play next` and `Add to queue` actions for queue acceleration
- **AND** the menu includes a `View in library` action to open the same item in Library context

#### Scenario: Recent-item overflow queue actions preserve active playback continuity

- **WHEN** a user chooses `Play next` or `Add to queue` from a recent-item overflow menu
- **THEN** the system updates the active queue without interrupting current playback

#### Scenario: Recent-item overflow can seed a transient queue from standalone playback

- **WHEN** a user is playing one standalone item and chooses `Play next` or `Add to queue` from a recent-item overflow menu
- **THEN** the system creates the same transient queue behavior used on other queue-capable surfaces
- **AND** Up Next reflects the newly created queued item without restarting the current track

#### Scenario: View in library keeps playback uninterrupted while changing context

- **WHEN** a user chooses `View in library` from a recent-item overflow menu
- **THEN** the app navigates to Library with the related saved item context visible when available
- **AND** active playback state remains uninterrupted during the context switch

#### Scenario: Empty recent context falls back to discovery guidance

- **WHEN** no recent rehearsal context exists
- **THEN** Recents shows a concise guidance path to discovery and saving the first practice item

#### Scenario: New user with empty library can reach first playback quickly

- **WHEN** a user has no saved tracks, loops, or playlists
- **THEN** the system provides a clear path from empty-state guidance to Drive discovery, first save, and playback start without requiring pre-existing library content

#### Scenario: Playing a playlist records one recent entry for the playlist

- **WHEN** a user plays a saved playlist and its session advances through several tracks
- **THEN** Recents holds one entry for that playlist and no entry for the individual tracks played from it
- **AND** other recent items are not evicted by the playlist's tracks

#### Scenario: Advancing within a playlist updates its entry in place

- **WHEN** a saved playlist session moves to another track
- **THEN** the playlist's recent entry records that track as its last played track and updates its last played time
- **AND** the entry moves to the top of Recents without adding another row

#### Scenario: Starting a playlist from a track records that track

- **WHEN** a user starts a saved playlist from one of its tracks
- **THEN** Recents records the playlist, not the track, with that track as its last played track

#### Scenario: Entry is not recorded before the playlist's own track is active

- **WHEN** a saved playlist session has started but its first track has not yet loaded and another item is still the active item
- **THEN** the system does not record that other item against the playlist's entry

#### Scenario: Resuming a playlist row continues from its last track

- **WHEN** a user resumes a playlist row and the row's last played track is still in the playlist
- **THEN** the playlist plays as a playlist session starting at that track

#### Scenario: Resuming a playlist row falls back to the start of the playlist

- **WHEN** a user resumes a playlist row and its last played track has been removed from the playlist
- **THEN** the playlist plays as a playlist session starting at its first track

#### Scenario: A deleted playlist is not shown in Recents

- **WHEN** a recent playlist entry refers to a playlist that no longer exists
- **THEN** Recents does not show that entry

#### Scenario: A transient queue does not become a recent playlist

- **WHEN** a user plays items from the transient `Current queue`
- **THEN** Recents records each played item as a track, loop or composite and records no playlist entry

#### Scenario: Old per-track playlist history is discarded

- **WHEN** the app restores stored recents that contain per-track playlist rows from before playlists became recent entries
- **THEN** those rows are dropped and the remaining recents are restored as before

#### Scenario: Playlist row overflow reuses the playlist menu and adds Queue playlist

- **WHEN** a user opens the vertical-ellipsis menu on a playlist recent row
- **THEN** the menu shows the saved playlist menu actions, including `View in library`
- **AND** the menu includes a `Queue playlist` action

#### Scenario: Queue playlist appends the playlist's items without interrupting playback

- **WHEN** a user is playing an item and chooses `Queue playlist` on a playlist recent row
- **THEN** the playlist's playable items are appended to the queue in playlist order
- **AND** current playback continues uninterrupted
- **AND** items that cannot be resolved are skipped

#### Scenario: Queue playlist seeds a transient queue from standalone playback

- **WHEN** a user is playing one standalone item and chooses `Queue playlist`
- **THEN** the system creates the same transient queue behavior used by `Add to queue` on other surfaces

#### Scenario: Queue playlist is unavailable while nothing is playing

- **WHEN** nothing is playing
- **THEN** the `Queue playlist` action is disabled
