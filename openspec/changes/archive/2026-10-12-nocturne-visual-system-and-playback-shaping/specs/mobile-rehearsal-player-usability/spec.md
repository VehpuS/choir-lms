## MODIFIED Requirements

### Requirement: Drive search supports reviewable complete-result selection

The system SHALL let users select mixed Drive search results individually or select every matching result before adding them to Library, and SHALL add those selections to Add's shared selection basket (see `multi-selection`) rather than to a query-bound selection.

#### Scenario: Enter and leave search-result selection mode

- **WHEN** a user enters selection mode from Drive search results
- **THEN** each selectable folder and supported audio row exposes a clear selected or unselected state
- **AND** the interface shows the current selection count and actions to cancel or continue
- **AND** canceling selection leaves the search query and result context intact

#### Scenario: Select all includes every paginated result

- **WHEN** a user chooses `Select all` while viewing Drive search results
- **THEN** the system prepares and selects the complete result set for the active Drive query and scope across every result page
- **AND** the user can deselect individual results before continuing
- **AND** the control does not mean only the currently rendered or first-page rows

#### Scenario: The select-all control becomes Deselect all once everything is selected

- **WHEN** every result of the active Drive query and scope that is loaded so far is selected, whether by `Select all` or by selecting rows one by one
- **THEN** the same control reads `Deselect all`, and choosing it removes those results from the basket
- **AND** if results are still being gathered, choosing it also stops the gathering, so no later page re-selects them
- **AND** basket items that came from other searches or folders stay selected, and the basket-wide `Clear` action remains the way to empty everything
- **AND** deselecting any one result, or a later page of results arriving, returns the control to `Select all`

#### Scenario: Search context change keeps explicit selections and ends a pending select-all

- **WHEN** a user changes the active query, Drive root, search scope, or browsed folder while results are selected
- **THEN** the system keeps every result already in the basket, including results added by a completed `Select all`, and continues to show the basket count
- **AND** a `Select all` still gathering pages for the previous query stops, keeps the results it had already added, and does not add results from the new context
- **AND** the basket view shows each kept result with its containing Drive path, so nothing is imported that the user cannot see and deselect

#### Scenario: Mixed selection collapses overlapping descendants

- **WHEN** selected search results include a folder and separately selected descendants of that folder
- **THEN** the interface indicates before confirmation that descendant selections will be covered by the recursive folder import
- **AND** the user is not shown duplicate track work in the effective import count

### Requirement: Queue and playback surfaces keep controls legible and mode-appropriate

The system SHALL keep queue and now-playing controls mode-aware, visually clear, and aligned with familiar mobile music semantics.

#### Scenario: Queue surface exposes actionable session controls

- **WHEN** a user opens Up Next during an active queue session
- **THEN** the system shows the queue's name, a summary line of item count, total length, queue mode, and repeat mode, and mode chips for `Ordered`, `Shuffle`, and repeat (`Off`, `One`, `All`) whose lit state shows the active modes
- **AND** the current and upcoming items follow, with the current item marked

#### Scenario: Queue view stays visible when many items are queued

- **WHEN** a user opens the active rehearsal queue with enough items to exceed the available sheet height
- **THEN** the queue list scrolls within the sheet, which is capped to the viewport
- **AND** the sheet header, queue summary, mode chips, and playlist actions remain visible without scrolling off-screen

#### Scenario: Queue rows expose direct play and reorder controls

- **WHEN** a user views rows in the active rehearsal queue
- **THEN** each row can be tapped to jump playback to that queue item, with the current item's row toggling play and pause, and exposes a drag handle for reorder
- **AND** rows carry no separate play button, and each row's accessible name says what tapping it does

#### Scenario: Queue row overflow supports queue management actions

- **WHEN** a user opens the overflow actions for a queue row
- **THEN** the system offers `Remove from queue`, `Move to start`, `Move to end`, and `Move to position`

#### Scenario: Move to position uses a bounded queue-position control

- **WHEN** a user chooses `Move to position` for a queue row
- **THEN** the system opens a modal with a slider bounded from queue position `1` through the last available queue position
- **AND** confirming the modal moves the selected row to that position in the active queue order

#### Scenario: Queue rows mark the current item without eyebrow copy

- **WHEN** a user views the active rehearsal queue
- **THEN** the current row shows an equalizer mark in place of its position number and sets its status (`Playing`, `Paused`, or `Loading`) before its meta line
- **AND** no row carries a `Now playing` or `Up next` eyebrow

#### Scenario: Queue view leaves item transport to the playback surface

- **WHEN** a user is in the active rehearsal queue view
- **THEN** the system does not repeat previous-item and next-item transport there
- **AND** users can jump to any queued item by tapping its row, and reach previous and next from the playback surface or the mini-player

#### Scenario: Up Next offers queue-to-playlist actions for active queues

- **WHEN** a user opens Up Next while an active queue session is present
- **THEN** the system exposes a pinned footer below the queue list with a `Save as playlist` action
- **AND** when that active queue session is backed by a saved playlist, the footer instead exposes `Update <playlist name>` as the primary action beside `Save as new`

#### Scenario: Creating a new playlist from Up Next preserves playback continuity

- **WHEN** a user creates a new playlist from the current queue in Up Next
- **THEN** the playlist is created from the queue's current item order
- **AND** the active queue session immediately becomes associated with that newly created playlist so `Update <playlist name>` is available for follow-up queue edits
- **AND** the current playback item and position continue without restart

#### Scenario: Updating a playlist from Up Next preserves playback continuity

- **WHEN** a user chooses `Update <playlist name>` from Up Next for an active queue session backed by a saved playlist
- **THEN** the system asks for confirmation before replacing that playlist's saved items and order with the current queue order
- **AND** the active queue session remains in place and playback continues without interruption

#### Scenario: Standalone playback can be promoted into a transient queue

- **WHEN** a user is playing a single item outside playlist context and performs `Play next` or `Add to queue` from a queue-capable item surface
- **THEN** the system promotes playback into a transient queue session without restarting the current item
- **AND** queue surfaces and controls become available for the resulting transient queue

#### Scenario: True standalone playback hides queue-only controls

- **WHEN** a user plays a standalone item outside queue context
- **AND** no follow-up items have been queued yet
- **THEN** the system omits queue-only controls while preserving current-item rehearsal controls and repeat behavior
