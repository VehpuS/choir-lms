## MODIFIED Requirements

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
- **THEN** the menu includes `Edit loop` and `Remove from library`, as defined by the shared saved-loop menu in `mobile-library-organization`
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
- **THEN** the system provides loop creation and management actions in that track context with visible parent-track context

#### Scenario: Loop creation stays as the only saved-track-specific row action

- **WHEN** a user compares saved track rows and saved loop rows in the Library
- **THEN** the system keeps their row-level action model aligned except that only saved tracks expose `Make loop`
- **AND** `Make loop` is offered from the shared overflow menu rather than as a dedicated inline button

#### Scenario: Search and organization views surface loops as their own result category

- **WHEN** a user views library search, tag, or folder results that include loops
- **THEN** the system shows loops in their own visible result category without requiring any special surfacing step
- **AND** those results retain parent-track linkage
