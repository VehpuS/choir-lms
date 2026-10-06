## ADDED Requirements

### Requirement: Multiple selection is one shared interaction across Add and Library

The system SHALL provide a single multiple-selection interaction — entry, per-row selected state, selection count, bulk-action bar, and exit — that every selectable list in Add and Library composes, rather than a per-surface implementation.

Companion mockup states: none yet. Task 9.0 produces or confirms them before implementation; until then the closest references are design screen 1e (rows), 1h (pinned two-action footer), and 1j (chips and kickers), per design Decision 8.

#### Scenario: Entering selection mode

- **WHEN** a user chooses `Select` from a selectable list's header, or long-presses a selectable row
- **THEN** the list enters selection mode, every selectable row shows an unselected glyph in place of its leading glyph, and a long-pressed row starts selected
- **AND** row-level trailing controls (play, save, overflow) are hidden while selection mode is active, so a tap on a row always toggles it

#### Scenario: Rows show their selected state without relying on color

- **WHEN** a row is selected or unselected in selection mode
- **THEN** it shows a filled check glyph or an empty circle glyph respectively, and a selected row also takes the active title treatment
- **AND** the row exposes its selected state to assistive technology, and toggling it keeps the 44pt minimum touch target

#### Scenario: The selection count and bulk actions stay in reach

- **WHEN** selection mode is active
- **THEN** the system shows the number of selected items in a live region, a `Cancel` action that leaves selection mode, and a pinned bulk-action bar at the bottom of the screen whose actions reflect the current selection
- **AND** bulk actions that cannot act on any selected item are hidden, and actions that are disabled for the current selection explain why when chosen or focused

#### Scenario: One control selects and deselects everything in the list

- **WHEN** selection mode is active in a list whose full set is known (Add's Drive search results, or a Library view after its filters and search)
- **THEN** the selection bar offers `Select all`, which selects every item of that set
- **AND** once every item of that set is selected, the same control reads `Deselect all` and removes those items from the selection
- **AND** deselecting any one item, or the set growing, returns the control to `Select all`
- **AND** `Deselect all` leaves items selected from other contexts in place, and the count and any pending gathering of results update at once

#### Scenario: Leaving selection mode

- **WHEN** a user chooses `Cancel`, completes a bulk action that ends the selection, or leaves the destination
- **THEN** the system exits selection mode, clears the selection, and restores each row's normal glyph and trailing controls without changing scroll position, filters, sort, or search

#### Scenario: Selection is keyed to stable identities

- **WHEN** the list re-renders, re-sorts, paginates, or refreshes while items are selected
- **THEN** the selection is preserved by item identity rather than by position
- **AND** an item that no longer exists is dropped from the selection and the count updates

### Requirement: Add keeps one selection basket across folders, roots, and search

The system SHALL let a user select Drive folders and supported audio files while browsing any folder in either Drive root and while viewing Drive search results, accumulating them into one selection basket that feeds the existing bulk import review.

#### Scenario: Select while browsing folders

- **WHEN** a user enters selection mode while browsing a Drive folder in Add
- **THEN** each folder row and supported audio row in that folder is selectable, and unsupported files remain visible but not selectable

#### Scenario: The basket persists across navigation and roots

- **WHEN** a user with a non-empty selection opens a subfolder, goes back, follows a breadcrumb, switches between `My Drive` and `Shared folders`, or runs a Drive search
- **THEN** the system keeps every previously selected item in the basket and keeps selection mode active
- **AND** rows in the newly shown location that are already in the basket show as selected

#### Scenario: The basket can be reviewed and pruned from anywhere

- **WHEN** the basket contains items outside the location on screen
- **THEN** the selection bar offers a way to view every selected item with its containing Drive path and to deselect any of them without navigating to its folder

#### Scenario: Continue opens the existing import review

- **WHEN** a user chooses `Continue` with a non-empty basket
- **THEN** the system opens the existing Drive import review with the whole basket as its selection, including overlap collapsing of folders and their separately selected descendants across roots
- **AND** after a confirmed import, the basket is cleared; after `Back` from review, the basket is kept

#### Scenario: A folder and its selected descendants are flagged in the basket

- **WHEN** the basket contains a folder and, separately, items inside that folder
- **THEN** the basket view marks those descendants as covered by the folder's recursive import before the user continues

### Requirement: Library list views support bulk actions over a selection

The system SHALL let a user select multiple items in the Files, Tracks, Loops, and Playlists views, in playlist detail, in tag detail, and in Library search results, and apply one action to the whole selection.

#### Scenario: Bulk actions available in Library

- **WHEN** a user has one or more items selected in a Library list view
- **THEN** the bulk-action bar offers, where they apply to the selection, `Play next`, `Add to queue`, `Add to playlist`, `Save as playlist`, `Edit tags`, `Copy to folder`, and `Remove from library`
- **AND** in the Files view it also offers `Move to folder` and `Delete from folder`
- **AND** in playlist detail it also offers `Remove from playlist`

#### Scenario: Selectable items per view

- **WHEN** a Library list view is in selection mode
- **THEN** every row the view lists is selectable: folders, track links, loop links, and playlist links in Files; tracks, loops, and playlists in their views; entries in playlist detail; tagged items in tag detail; and every result kind in Library search results
- **AND** a Library search selection may mix entity kinds

#### Scenario: Playback and playlist actions expand containers into their contents

- **WHEN** a user applies `Play next`, `Add to queue`, `Add to playlist`, or `Save as playlist` to a selection that includes folders or playlists
- **THEN** each selected folder contributes its descendant tracks and loops in the Files view's current sort order, and each selected playlist contributes its entries in playlist order
- **AND** selected tracks and loops contribute themselves
- **AND** the contributed items are applied in the order the selection is displayed, and the confirmation states the effective item count

#### Scenario: Queue actions keep playback continuity

- **WHEN** a user applies `Play next` or `Add to queue` to a selection
- **THEN** the system inserts every effective item as one ordered block, directly after the current item for `Play next` or at the end of the queue for `Add to queue`
- **AND** the current playback item is not interrupted, and standalone playback is promoted into the transient queue exactly as the single-item queue actions do

#### Scenario: Save as playlist creates one playlist from the selection

- **WHEN** a user applies `Save as playlist` to a selection
- **THEN** the system prompts for a playlist name with the same naming and uniqueness behavior as creating a playlist elsewhere, creates one playlist whose entries are the effective items in order, and files it in the current Files folder when started from Files or in the Files root otherwise

#### Scenario: Add to playlist appends the selection in order

- **WHEN** a user applies `Add to playlist` to a selection and chooses an existing playlist
- **THEN** the system appends the effective items as entries in order through the same playlist-selection flow used for a single item
- **AND** selecting a playlist that is itself in the selection is prevented

#### Scenario: Copy and move act on the selected nodes, not their contents

- **WHEN** a user applies `Copy to folder` or `Move to folder` to a selection
- **THEN** the system opens the existing destination picker once for the whole selection
- **AND** `Copy to folder` creates one new file link to the same underlying entity per selected track, loop, or playlist, and `Move to folder` re-parents each selected link or folder
- **AND** selected folders are excluded from `Copy to folder`, because copying a folder is not an existing Files operation, and the destination picker says how many folders were left out
- **AND** folders are not expanded for these actions, and a move destination that is a selected folder or its descendant is blocked with the existing invalid-target feedback

#### Scenario: Bulk copy and move resolve name conflicts in one pass

- **WHEN** a bulk copy or move would create names that conflict case-insensitively within the destination folder
- **THEN** the system lists the conflicting items before applying the change and lets the user keep both with a unique `Copy` name proposal or skip each conflicting item, and applies non-conflicting items as chosen
- **AND** a same-folder bulk copy proposes unique `Copy` names without asking

#### Scenario: Remove and delete summarize aggregated impact before one confirmation

- **WHEN** a user applies `Remove from library` or `Delete from folder` to a selection
- **THEN** the system shows one confirmation that aggregates the impact across the whole selection: for `Delete from folder`, how many links, subfolders, and last-link entities will be removed; for `Remove from library`, how many tracks, loops, adjusted entities, playlists, folder links, and playlist entries will be removed, including cascades
- **AND** nothing is removed until the user confirms, and the confirmation lets the user inspect the affected underlying entities
- **AND** destructive actions act only on the selected items themselves and never expand a selected folder or playlist into its contents for `Remove from library`

#### Scenario: Remove from library excludes items it does not apply to

- **WHEN** a selection for `Remove from library` includes folders
- **THEN** the folders are excluded from the action and the confirmation says so, and `Delete from folder` remains the way to remove a folder

#### Scenario: Remove from playlist removes selected entries only

- **WHEN** a user applies `Remove from playlist` to selected entries in playlist detail
- **THEN** the system removes exactly those entries, including a repeated item's selected occurrences only, and keeps the underlying tracks and loops in the library

#### Scenario: Bulk tag editing shows shared and mixed tags

- **WHEN** a user applies `Edit tags` to a selection
- **THEN** the tag editor shows tags present on every selected item as set, tags present on only some as mixed, and offers the existing suggestion row
- **AND** adding a tag applies it to every selected item, removing a tag clears it from every selected item, and a mixed tag left untouched is unchanged on each item
- **AND** tags are applied to the selected entities themselves, including selected folders, and are not expanded into folder or playlist contents

#### Scenario: A bulk action is applied as one change

- **WHEN** a confirmed bulk action runs
- **THEN** the system persists it as one library update, so a reload shows either the whole applied result or none of it
- **AND** active playback and queue state reflect removals immediately, continuing with the next available item when the playing item was removed
- **AND** after the action, the system shows one acknowledgment naming the action and effective count, and exits selection mode
