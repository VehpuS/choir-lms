## ADDED Requirements

### Requirement: Track rows support ad-hoc queue acceleration actions

The system SHALL provide quick queue actions from track-focused contexts so users can shape the current rehearsal session without opening playlist editors.

#### Scenario: Add a saved item to play next from row-level actions

- **WHEN** a user opens row actions for a playable saved track or loop while playback is active on any queue-capable surface
- **THEN** the system offers a `Play next` style action that inserts that item immediately after the current item in the active queue

#### Scenario: Add a saved item to queue from row-level actions

- **WHEN** a user opens row actions for a playable saved track or loop while playback is active on any queue-capable surface
- **THEN** the system offers an `Add to queue` style action that appends that item to the active upcoming queue without interrupting current playback

#### Scenario: Queue actions create a transient queue from standalone playback

- **WHEN** a user is playing a single track outside a playlist-backed queue and then chooses `Play next` or `Add to queue` for another playable item
- **THEN** the system converts the current playback session into a transient queue
- **AND** the currently playing track remains the first queue item
- **AND** the newly selected item is inserted or appended according to the chosen queue action

#### Scenario: Queue quick actions preserve active playback continuity

- **WHEN** a user runs an ad-hoc queue quick action
- **THEN** the system applies the queue update without interrupting current playback

#### Scenario: Up Next can create a new playlist from the active queue

- **WHEN** a user opens Up Next for an active queue session and chooses `Create new playlist`
- **THEN** the system creates a new playlist from the current queue ordering
- **AND** playback continues uninterrupted in the current queue session

#### Scenario: Up Next can update an existing playlist with currently enqueued items

- **WHEN** a user opens Up Next for an active queue session and chooses `Update playlist`
- **THEN** the system updates the selected playlist with those enqueued items in queue order
- **AND** playback continues uninterrupted in the current queue session

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
- **THEN** the row labels the exact target item title that will play
- **AND** the row play icon resumes that labeled item only (not a generic or ambiguous card-level target)

#### Scenario: Multiple recents are presented as per-item rows

- **WHEN** more than one recent rehearsal item exists
- **THEN** Recents renders a compact recent-items list with one row per item
- **AND** each row exposes its own icon-only play control so users can resume a specific item directly
- **AND** those recent items remain available after app relaunch until replaced or evicted by the recents history policy

#### Scenario: Recent-item overflow includes queue acceleration and library handoff actions

- **WHEN** a user opens the vertical-ellipsis menu on a recent rehearsal row
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

#### Scenario: Recents can surface shortcut metadata such as popular tags

- **WHEN** Recents is enabled as an acceleration surface
- **THEN** the system may show shortcut metadata such as popular tags without making Recents a required step for core discovery or playback

### Requirement: Loop creation uses smart naming defaults

The system SHALL prefill loop naming with a meaningful default that users can keep or edit before saving.

#### Scenario: New loop gets an auto-generated default name

- **WHEN** a user opens loop creation for a source track
- **THEN** the system pre-populates loop name input with a context-aware default derived from source identity and selected time range

#### Scenario: User overrides the default loop name

- **WHEN** a user edits the suggested loop name before save
- **THEN** the system saves the user-entered name without forcing the default format

### Requirement: Search supports quick re-entry through recent queries

The system SHALL expose recent search terms to reduce repeated typing in frequent rehearsal sessions, with search available from both Add and Library.

#### Scenario: Search shows recent queries before typing

- **WHEN** a user opens Add or Library without an active query in the visible search entry point
- **THEN** the system presents recent search terms as tap-to-run suggestions

#### Scenario: Selecting a recent query executes search immediately

- **WHEN** a user taps a recent search term
- **THEN** the system applies the term, runs search, and shows updated results in the same search context

#### Scenario: Recent-query suggestions are contextual to the active search surface

- **WHEN** a user opens Drive search or app-library search without an active query
- **THEN** the system shows recent-query suggestions relevant to that active search context

### Requirement: Loops support track-scoped management while remaining independently accessible as library entities

The system SHALL provide track-scoped loop management from parent tracks while keeping saved loops accessible from the main Library section and from search and organization views.

#### Scenario: Saved track overflow exposes track-loop navigation when loops exist

- **WHEN** a saved track owns one or more saved loops
- **THEN** the track overflow menu includes `View track loops`
- **AND** selecting that action opens a track-scoped loop view for that parent track
- **AND** that loop view replaces the main Library browse UI until the user returns with the provided back action

#### Scenario: Top-level Saved loops section remains available in Library

- **WHEN** a user is browsing Library outside explicit search, tag, or folder result contexts
- **THEN** the system still shows a top-level Saved loops section for cross-track loop access
- **AND** that section does not remove or replace the `View track loops` parent-track entry point

#### Scenario: Track-scoped loop view keeps loops as actionable as tracks

- **WHEN** a user opens a track-scoped loop view from `View track loops`
- **THEN** the view keeps the parent-track context visible
- **AND** the view behaves like a dedicated Library detail surface rather than an inline section swap
- **AND** each loop remains directly available for playback, add to playlist, queue actions, and other applicable shared row actions
- **AND** the view provides ordered playback for the track's loops as a queued series, including starting from an individual loop row
- **AND** the view includes a `Make new loop` action for that same parent track

#### Scenario: Saved loop overflow exposes in-place editing from loop surfaces

- **WHEN** a user opens row actions for a saved loop from the top-level Saved loops section or a track-scoped loop view
- **THEN** the menu includes `Edit loop` and `Remove loop`
- **AND** `Edit loop` opens the existing loop builder in edit mode for that loop instead of creating a duplicate saved loop

#### Scenario: Active loop playback does not block editing

- **WHEN** a user chooses `Edit loop` for a saved loop that is currently active in playback
- **THEN** the system opens the loop editor without requiring a separate pause-confirm step
- **AND** the user can update that loop while its playback context remains active

#### Scenario: Saving an edited active loop refreshes playback context

- **WHEN** a user saves changes to a loop that is the current playback item or is already queued in the active session
- **THEN** the system updates that saved loop in place
- **AND** the active queue and current playback context pick up the edited loop metadata and timing without requiring the user to rebuild the queue manually

#### Scenario: Loop actions remain available from parent track context

- **WHEN** a user opens a saved track context that owns one or more loops
- **THEN** the system provides loop creation and management actions in that track context with visible parent-track provenance

#### Scenario: Loop creation stays as the only saved-track-specific row action

- **WHEN** a user compares saved track rows and saved loop rows in the Library
- **THEN** the system keeps their row-level action model aligned except that only saved tracks expose `Make loop`
- **AND** `Make loop` is offered from the shared overflow menu rather than as a dedicated inline button

#### Scenario: Search and organization views surface loops as their own result category

- **WHEN** a user views library search, tag, or folder results that include loops
- **THEN** the system shows loops in their own visible result category without requiring any special surfacing step
- **AND** those results retain parent-track linkage
