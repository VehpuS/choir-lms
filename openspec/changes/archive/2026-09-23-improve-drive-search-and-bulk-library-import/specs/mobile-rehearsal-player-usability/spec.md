## ADDED Requirements

### Requirement: Drive search supports reviewable complete-result selection

The system SHALL let users select mixed Drive search results individually or select every matching result before adding them to Library.

#### Scenario: Enter and leave search-result selection mode

- **WHEN** a user enters selection mode from Drive search results
- **THEN** each selectable folder and supported audio row exposes a clear selected or unselected state
- **AND** the interface shows the current selection count and actions to cancel or continue
- **AND** canceling selection leaves the search query and result context intact

#### Scenario: Select all matching includes every paginated result

- **WHEN** a user chooses `Select all matching`
- **THEN** the system prepares and selects the complete result set for the active Drive query and scope across every result page
- **AND** the user can deselect individual results before continuing
- **AND** the control does not mean only the currently rendered or first-page rows

#### Scenario: Search context change clears selection

- **WHEN** a user changes the active query, Drive root, search scope, or browsed folder while results are selected
- **THEN** the system clears the prior query-bound selection
- **AND** it does not import stale selections as though they belonged to the new context

#### Scenario: Mixed selection collapses overlapping descendants

- **WHEN** selected search results include a folder and separately selected descendants of that folder
- **THEN** the interface indicates before confirmation that descendant selections will be covered by the recursive folder import
- **AND** the user is not shown duplicate track work in the effective import count

### Requirement: Bulk Drive imports are reviewed and recoverable

The system SHALL let users review the effective import plan, observe progress, and recover from cancellation or item-level failures without losing successful work.

#### Scenario: Review effective import before confirmation

- **WHEN** a user continues from a Drive result selection
- **THEN** the system lets the user choose the Library destination
- **AND** when folders are selected, it lets the user choose `Preserve structure` or `Flatten`
- **AND** the review shows counts for folders to create, new tracks, reused or already-present tracks, unsupported files, and collapsed overlaps before confirmation

#### Scenario: Import exposes meaningful progress

- **WHEN** a confirmed bulk import is preparing Drive contents or updating Library
- **THEN** the system identifies the active phase and shows completed and total work when totals are known
- **AND** the user can distinguish ongoing work from a stalled or failed operation

#### Scenario: Cancel import without rolling back successes

- **WHEN** a user cancels an in-progress bulk import
- **THEN** the system stops scheduling new work as soon as practical
- **AND** already-created sources, folders, and links remain in Library
- **AND** the completion summary identifies the operation as partially completed and cancelled

#### Scenario: Partial failure keeps successes and supports retry

- **WHEN** one or more independent items fail during a bulk import
- **THEN** the system continues eligible independent work and retains successful changes
- **AND** the completion summary distinguishes created, reused, already-present, unsupported, overlap-collapsed, cancelled, and failed outcomes
- **AND** the user can retry failed work without repeating successful work
