## ADDED Requirements

### Requirement: Adjusted tracks and loops are ordinary organizable library entities

The system SHALL treat entities created from playback shaping as first-class members of the saved library for browsing, ordering, filtering, tagging, and search, while keeping their source relationship and transform visible.

Companion mockup state: design screen 1j shows an adjusted track in search results with its transform and source in the row.

#### Scenario: Adjusted entities appear in the Files, Tracks, and Loops views

- **WHEN** an adjusted track or loop exists in the saved library
- **THEN** it appears in the Files view alongside other saved entities, and in the Tracks or Loops view according to its kind

#### Scenario: Adjusted entities participate in sort, filter, and search

- **WHEN** a user applies an explicit sort field and direction, an entity-type filter, a tag filter with either match mode, or a library search query
- **THEN** adjusted entities are included on the same terms as saved tracks and loops

#### Scenario: Adjusted entities stay visually distinguishable from their source

- **WHEN** an adjusted entity appears in any list or result row
- **THEN** the row shows its speed and pitch transform and identifies the source item it was derived from

#### Scenario: Adjusted entities are ordinary files ordered only by the active sort

- **WHEN** the Files view lists a folder that contains adjusted tracks or adjusted loops
- **THEN** each one is a top-level row of its own kind, named by its own (possibly renamed) label
- **AND** rows are ordered only by the active sort field and direction, with no grouping, nesting, or indentation under the source track

#### Scenario: Adjusted entities reach their source's original Drive location

- **WHEN** a user chooses `Show in Add` or `Open in Google Drive` for an adjusted track or loop
- **THEN** the system resolves the current Drive location through the adjusted entity's source track, exactly as it would for that source track

#### Scenario: Bulk Drive import never reuses an adjusted entity as a canonical source

- **WHEN** a bulk Drive import plans reuse for a Drive file that has a saved source track and one or more adjusted entities of that track
- **THEN** the planner matches only the saved source track as the canonical source
- **AND** it does not link, count, or report an adjusted entity as reused or already present

### Requirement: Saved item menus are the same in every Library view apart from view-specific actions

The system SHALL build the overflow menu for a saved track, loop, or playlist from one shared definition per item kind, so the item's own actions, labels, order, sections, and state feedback are identical in the Files, Tracks, Loops, and Playlists views, in tag detail, in Library search results, and in the track-scoped loop view. A view SHALL add only actions that act on its own container, never remove or relabel an item action.

#### Scenario: Saved track menu

- **WHEN** a user opens the overflow menu of a saved track in any of those views
- **THEN** the menu shows the track's `From <path>` provenance line when its original Drive location is known
- **AND** it offers, in this order and where they apply: `Play next`, `Add to queue`, `Make loop`, `View track loops`, `Add to playlist`, `Reconnect`, `Show in Add`, `Open in Google Drive`, `Edit tags`, then the view's own actions, then `Remove from library` last

#### Scenario: Saved loop menu

- **WHEN** a user opens the overflow menu of a saved loop in any of those views
- **THEN** it offers, in this order and where they apply: `Play next`, `Add to queue`, `Add to playlist`, `Edit loop`, `Edit tags`, then the view's own actions, then `Remove from library` last

#### Scenario: Saved playlist menu

- **WHEN** a user opens the overflow menu of a saved playlist in any of those views
- **THEN** it offers `Add items`, `Edit tags`, then the view's own actions, then `Remove from library` last

#### Scenario: View-specific actions

- **WHEN** the menu is opened from the Files view
- **THEN** the view's own actions are the file-link actions `Create a copy`, `Rename`, `Move to folder`, and `Delete from folder`, which act on that link only, with `Delete from folder` directly before `Remove from library`
- **AND** outside Files, where a row is the item itself rather than a link, a playlist's own action is `Rename playlist`, which renames the playlist
- **AND** no other view adds, removes, or relabels actions

#### Scenario: One removal label with each kind's existing flow

- **WHEN** a user chooses `Remove from library` for a track, loop, or playlist from any view
- **THEN** the system runs that kind's existing impact-aware confirmation and removal: the track cascade, loop removal, or playlist removal
- **AND** the action reads `Remove from library` for every kind rather than `Remove`, `Remove loop`, or `Remove playlist`

## MODIFIED Requirements

### Requirement: Files rows expose standard explorer operations

The system SHALL expose standard explorer operations through row-level overflow menus so users can manage folders and saved-entity links without leaving the current path context.

#### Scenario: Files actions reuse existing entity flows where available

- **WHEN** a user chooses `Edit tags`, `Add to playlist`, `Make loop`, `Play next`, or `Add to queue` from Files
- **THEN** the system reuses the same tag editor, playlist-selection flow, loop-builder flow, or queue-operation behavior already used elsewhere in Library for that underlying entity
- **AND** Files does not introduce a divergent file-only version of those flows

#### Scenario: Track links expose explorer and rehearsal operations

- **WHEN** a user opens the more-options menu for a track link in Files
- **THEN** the menu includes the shared saved-track actions defined by "Saved item menus are the same in every Library view apart from view-specific actions" (`Play next`, `Add to queue`, `Make loop`, `Add to playlist`, `Show in Add`, `Open in Google Drive`, `Edit tags`, and `Remove from library`) plus the Files link actions `Create a copy`, `Rename`, `Move to folder`, and `Delete from folder`
- **AND** the action-sheet presentation exposes a separate `Cancel` dismissal affordance

#### Scenario: Loop links expose shared loop operations

- **WHEN** a user opens the more-options menu for a loop link in Files
- **THEN** the menu includes the shared saved-loop actions (`Play next`, `Add to queue`, `Add to playlist`, `Edit loop`, `Edit tags`, and `Remove from library`) plus the Files link actions `Create a copy`, `Rename`, `Move to folder`, and `Delete from folder`
- **AND** the action-sheet presentation exposes a separate `Cancel` dismissal affordance

#### Scenario: Files queue actions keep existing playback continuity behavior

- **WHEN** a user chooses `Play next` or `Add to queue` from a track or loop link in Files
- **THEN** the system preserves the same active-queue update behavior used on other queue-capable library surfaces
- **AND** the action does not interrupt the current playback item
- **AND** when playback is currently standalone, the action can still promote that session into the transient queue model defined elsewhere in this change

#### Scenario: Playlist links expose shared organization operations

- **WHEN** a user opens the more-options menu for a playlist link in Files
- **THEN** the menu includes the shared saved-playlist actions (`Add items`, `Edit tags`, and `Remove from library`) plus the Files link actions `Create a copy`, `Rename`, `Move to folder`, and `Delete from folder`
- **AND** the action-sheet presentation exposes a separate `Cancel` dismissal affordance

#### Scenario: Folder rows expose shared file operations

- **WHEN** a user opens the more-options menu for a folder in Files
- **THEN** the menu includes `Edit tags`, `Rename`, `Move to folder`, and `Delete from folder`
- **AND** the action-sheet presentation exposes a separate `Cancel` dismissal affordance

#### Scenario: Rename and move act on the visible file node or link

- **WHEN** a user chooses `Rename` or `Move to folder` from a Files overflow menu
- **THEN** the system prompts for the new visible name or destination folder before applying the change
- **AND** track, loop, and playlist rename or move changes only the current file link, not the underlying entity or sibling links
- **AND** folder rename or move updates the folder node itself without rewriting metadata on linked tracks, loops, or playlists

#### Scenario: Delete from folder confirms pointer-versus-entity impact

- **WHEN** a user chooses `Delete from folder` for a file link in Files
- **THEN** the system asks for confirmation before applying the removal
- **AND** if other file links remain, the confirmation explains that only the current pointer will be removed
- **AND** if the current link is the last remaining file link, the confirmation explains that the underlying saved entity will also be deleted from the library
- **AND** last-link deletion does not proceed unless the user explicitly confirms that library-level deletion impact

### Requirement: Track-level remove from library is always available and dependency-aware

The system SHALL keep track-level `Remove from library` available from track contexts regardless of active playback or existing organization references, and SHALL require an explicit impact-aware confirmation before removal.

#### Scenario: Remove from library remains available during active playback and active references

- **WHEN** a user opens actions for a saved track that is currently playing, or one of whose loops or adjusted entities is currently playing, and that track has loops or adjusted entities, appears in folders, or appears in playlists
- **THEN** the track-level `Remove from library` action is still available
- **AND** the action is not hidden or disabled because of active playback or those references

#### Scenario: Remove from library confirmation summarizes all affected references

- **WHEN** a user chooses `Remove from library` for a saved track
- **THEN** the system shows a confirmation dialog before applying changes
- **AND** the confirmation summary lists affected dependent data including loops of that track, adjusted tracks and loops made from it, folder links, and playlist entries
- **AND** the user must explicitly confirm before removal occurs

#### Scenario: Remove from library cascades cleanup of track dependencies

- **WHEN** a user confirms `Remove from library` for a saved track
- **THEN** the system removes the track entity from the library
- **AND** the system removes all file links that point to that track
- **AND** the system removes the loops of that track and the adjusted tracks and loops made from it
- **AND** the system removes playlist entries that reference that track or any removed loop or adjusted entity
- **AND** active playback and queue state are updated immediately so removed items are no longer referenced, while playback continues with the next available queue item when possible
