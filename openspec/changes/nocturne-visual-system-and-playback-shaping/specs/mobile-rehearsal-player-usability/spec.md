## MODIFIED Requirements

### Requirement: Drive search supports reviewable complete-result selection

The system SHALL let users select mixed Drive search results individually or select every matching result before adding them to Library, and SHALL add those selections to Add's shared selection basket (see `multi-selection`) rather than to a query-bound selection.

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

#### Scenario: Search context change keeps explicit selections and ends a pending select-all

- **WHEN** a user changes the active query, Drive root, search scope, or browsed folder while results are selected
- **THEN** the system keeps every result already in the basket, including results added by a completed `Select all matching`, and continues to show the basket count
- **AND** a `Select all matching` still gathering pages for the previous query stops, keeps the results it had already added, and does not add results from the new context
- **AND** the basket view shows each kept result with its containing Drive path, so nothing is imported that the user cannot see and deselect

#### Scenario: Mixed selection collapses overlapping descendants

- **WHEN** selected search results include a folder and separately selected descendants of that folder
- **THEN** the interface indicates before confirmation that descendant selections will be covered by the recursive folder import
- **AND** the user is not shown duplicate track work in the effective import count
