## ADDED Requirements

### Requirement: App-owned library search is available as a dedicated search function

The system SHALL provide a dedicated app-library search function for saved rehearsal entities that is separate from Google Drive discovery search.

#### Scenario: Library search returns saved entities only

- **WHEN** a user runs app-library search
- **THEN** the system returns only app-owned saved entities such as tracks, loops, playlists, folders, and tags

#### Scenario: Library search supports quick filtering

- **WHEN** a user narrows app-library search
- **THEN** the system supports context-relevant filter controls so users can quickly reduce large result sets
- **AND** the `Show` filter section appears only when the active Library view is `Files`
- **AND** the `Tracks`, `Loops`, and `Playlists` views do not repeat a `Show` filter for their own entity type

#### Scenario: Library search highlights matched query text in results

- **WHEN** a user runs app-library search with an active non-empty query
- **THEN** each matching library result highlights the text segments that matched the query
- **AND** highlighted segments refresh when filters or query text change so visual emphasis matches the current result set

#### Scenario: Files search defaults to the current folder scope

- **WHEN** a user opens Library search while Files is the active Library view
- **THEN** the search defaults to the currently browsed folder subtree context
- **AND** the visible search scope makes that current-folder context explicit

#### Scenario: Files search can broaden to all Files

- **WHEN** a user changes Files search scope from the current folder to `All Files`
- **THEN** search results can include matching saved items outside the currently browsed folder path
- **AND** the visible search scope updates immediately so users know the search corpus changed

#### Scenario: All Files results show containing location context

- **WHEN** Files search returns matches outside the currently visible folder list
- **THEN** each such result shows supporting location metadata for its containing folder path
- **AND** users do not need to open the item first just to understand where it lives in the file tree

### Requirement: Library entities support tag-based organization

The system SHALL support tags for app-owned library entities so users can organize rehearsal material by choir part, context, or practice intent.

#### Scenario: Assign tags to saved entities

- **WHEN** a user edits a saved track, loop, or playlist organization metadata
- **THEN** the system allows adding and removing tags without affecting playback semantics

#### Scenario: Tag edits follow the underlying saved entity across file links

- **WHEN** a user edits tags from any Files row or dedicated entity view for a saved track, loop, or playlist
- **THEN** the system updates the underlying saved entity metadata
- **AND** every file link that points to that entity reflects the updated tags

#### Scenario: Folder tags remain local to the folder node

- **WHEN** a user edits tags for a folder in Files
- **THEN** the system updates that folder node's own tags
- **AND** the change does not modify tags on linked tracks, loops, playlists, or other folders

#### Scenario: Loops remain independently taggable in track-context-first browsing

- **WHEN** default Library browsing reaches a loop through its parent track context
- **THEN** the system still allows tags to be assigned directly to that loop
- **AND** the loop keeps those tags when shown in search, tag, or folder results

#### Scenario: Filter by one or more tags

- **WHEN** a user selects one or more tags in library organization controls
- **THEN** the system filters visible saved entities to those matching the selected tags

### Requirement: Library includes an explorer-style Files view for mixed saved entities

The system SHALL provide a unified Files view for app-owned library content that follows standard mobile file-explorer paradigms while preserving focused Tracks, Loops, and Playlists views.

#### Scenario: Files view presents standard explorer navigation chrome

- **WHEN** a user opens the Library Files view
- **THEN** the system shows a navigation bar with a back action to the parent folder and the current folder title
- **AND** the system shows a breadcrumb bar for the path from Files root to the current folder directly below that navigation bar
- **AND** breadcrumb segments are tappable so users can jump directly to any parent folder
- **AND** the breadcrumb bar scrolls horizontally when the full path is wider than the available screen width
- **AND** the system shows a persistent floating circular `+` create control at the lower trailing edge above bottom safe-area chrome while Files is active

#### Scenario: Files view renders one mixed-entity explorer list

- **WHEN** a user is browsing a folder in Files
- **THEN** the system renders subfolders, track links, loop links, and playlist links in one vertically scrolling list
- **AND** each row uses a leading entity-type icon, primary text, and a trailing more-options trigger
- **AND** the UI does not split the folder contents into separate cards or section panels by entity type

#### Scenario: Files row body uses explorer-style primary actions

- **WHEN** a user taps the row body for an item in Files
- **THEN** tapping a folder pushes the next folder level in the same explorer stack
- **AND** tapping a track or loop starts the existing playback behavior without navigating away from the current folder
- **AND** tapping a playlist opens the existing playlist detail with a visible back action to the originating Files folder context

#### Scenario: Files add action creates current-folder items

- **WHEN** a user opens the floating Files `+` create control from the current folder
- **THEN** the system offers `Create folder`, `Add tracks from Drive`, and `Create playlist`
- **AND** each action targets the currently visible folder

#### Scenario: Files add control follows the Google Drive floating-create pattern

- **WHEN** a user is browsing Library Files
- **THEN** the Files create control is rendered as a persistent floating circular `+` button instead of a header icon
- **AND** the control remains visible while the list scrolls
- **AND** the control stays above the tab bar and mini-player safe area rather than obscuring them

#### Scenario: Dedicated entity views remain available inside Library

- **WHEN** a user wants to browse only tracks, only loops, or only playlists
- **THEN** the system provides a first-class Library view selector for the unified Files view and dedicated entity views
- **AND** switching views stays inside the Library context rather than routing through a separate destination
- **AND** each dedicated view preserves the current focused UX patterns for that entity type rather than forcing navigation through Files
- **AND** the selector is rendered as direct `Files`, `Tracks`, `Loops`, and `Playlists` buttons instead of large descriptive header copy

#### Scenario: Focused track browsing keeps saved loops visible while preserving track entry points

- **WHEN** a user is browsing a focused track-oriented Library view outside explicit search, tag, or folder result contexts
- **THEN** the system keeps a top-level Saved loops section available in that focused browse presentation
- **AND** tracks with loops expose a `View track loops` navigation affordance for parent-track-specific loop management

### Requirement: Files browse order is explicit and user-controlled

The system SHALL expose explicit Files sort controls so users can understand and change browse order in the unified explorer.

#### Scenario: Files exposes explicit sort options

- **WHEN** a user opens Files sort controls
- **THEN** the system offers `Name`, `Type`, `Date added`, and `Date opened`
- **AND** the default Files browse sort is `Name`

#### Scenario: Name sorting is case-insensitive

- **WHEN** Files is sorted by `Name`
- **THEN** the system compares visible names case-insensitively rather than treating case-only differences as distinct alphabetical groups

#### Scenario: Folders stay grouped first across Files sort modes

- **WHEN** a user changes Files sort mode
- **THEN** folder rows remain grouped before non-folder rows in the explorer list
- **AND** the active sort mode is applied within those folder and non-folder groups rather than interleaving folders arbitrarily with playable items

#### Scenario: Type sorting groups items by entity type after folders

- **WHEN** Files is sorted by `Type`
- **THEN** folders remain the leading group
- **AND** non-folder items are grouped by entity type after the folder group

#### Scenario: Date sorting is newest-first

- **WHEN** Files is sorted by `Date added` or `Date opened`
- **THEN** the most recently added or most recently opened items appear first within the active folder/file grouping

#### Scenario: Files search results respect the active sort mode

- **WHEN** a user is viewing Files search results
- **THEN** the visible result ordering continues to follow the currently selected Files sort mode after search filtering
- **AND** the app does not silently switch to a hidden alternate ordering model

### Requirement: Files organization separates file-tree nodes from underlying saved entities

The system SHALL represent Files hierarchy entries as file-tree nodes so saved tracks, loops, and playlists can behave like standard explorer items without losing their canonical app state.

#### Scenario: One underlying entity can appear in multiple folders

- **WHEN** a user files the same saved track, loop, or playlist in more than one folder
- **THEN** the system creates multiple file links that point to the same underlying entity
- **AND** editing the underlying entity remains visible through every file link

#### Scenario: Shared entity updates flow through all links while visible names stay local

- **WHEN** the underlying metadata for a saved track, loop, or playlist changes
- **THEN** every file link that points to that entity reflects the updated shared metadata such as tags or playback details
- **AND** each file link keeps its own optional visible-name override unless that specific link is renamed

#### Scenario: Renaming a file link affects only that visible pointer

- **WHEN** a user renames a track, loop, or playlist from the Files explorer
- **THEN** the system updates only that file link's visible name
- **AND** the underlying Drive path, saved entity identity, and other file links keep their existing names unless separately renamed
- **AND** different links to the same underlying entity may use different visible names at the same time

#### Scenario: Moving a file link changes its folder without changing the underlying entity

- **WHEN** a user chooses `Move to folder` for a track, loop, or playlist link
- **THEN** the system updates the file link's parent folder
- **AND** the underlying saved entity remains unchanged

#### Scenario: Removing a file link preserves the underlying entity while other links remain

- **WHEN** a user removes a track, loop, or playlist link from the current folder
- **AND** at least one other file link still points to the same underlying entity
- **THEN** the system removes only the current file link
- **AND** the underlying saved entity remains in the library

#### Scenario: Removing the last file link deletes the underlying entity

- **WHEN** a user removes the last remaining file link for a track, loop, or playlist
- **THEN** the system removes that file link
- **AND** the system also deletes the underlying saved entity from the library

#### Scenario: Folder removal explains contents and last-link impact before confirmation

- **WHEN** a user chooses `Remove` for a folder that is not empty
- **THEN** the system summarizes how many subfolders, track links, loop links, and playlist links will be removed
- **AND** the system reports how many underlying entities would be deleted because those links are their last remaining references
- **AND** the user can inspect the affected underlying entities before confirming deletion

#### Scenario: Folder rows can hold loops directly

- **WHEN** a folder contains one or more loop links
- **THEN** the Files view or a folder result view can display those loops directly without requiring navigation through the parent track first
- **AND** each loop still shows parent-track linkage

### Requirement: Files mutations follow standard explorer guardrails

The system SHALL enforce standard mobile file-explorer guardrails for copy, create, rename, and move operations.

#### Scenario: Create a copy creates another file link to the same underlying entity

- **WHEN** a user chooses `Create a copy` for a track, loop, or playlist link in Files
- **THEN** the system opens the same destination-picker pattern used by `Move to folder`
- **AND** confirming that flow creates a new file link to the same underlying entity without moving the original link

#### Scenario: Same-folder copy defaults to a case-insensitively unique Copy name

- **WHEN** a user creates a copy into the current folder
- **THEN** the system proposes a visible name with `Copy` appended
- **AND** if needed, the system adjusts that proposal until it is unique under case-insensitive same-parent comparison

#### Scenario: Names are unique case-insensitively within a parent folder

- **WHEN** a user creates, renames, copies, or moves a folder or file link into a parent folder
- **THEN** the system treats names that differ only by case as conflicting duplicates
- **AND** the change cannot be committed until the visible name is case-insensitively unique within that parent folder

#### Scenario: Folder moves cannot target the folder itself or its descendants

- **WHEN** a user moves a folder in Files
- **THEN** the system blocks choosing that folder itself or any of its descendant folders as the destination
- **AND** the user receives clear feedback that the target location is invalid

### Requirement: Files rows expose standard explorer operations

The system SHALL expose standard explorer operations through row-level overflow menus so users can manage folders and saved-entity links without leaving the current path context.

#### Scenario: Files actions reuse existing entity flows where available

- **WHEN** a user chooses `Edit tags`, `Add to playlist`, `Make loop`, `Play next`, or `Add to queue` from Files
- **THEN** the system reuses the same tag editor, playlist-selection flow, loop-builder flow, or queue-operation behavior already used elsewhere in Library for that underlying entity
- **AND** Files does not introduce a divergent file-only version of those flows

#### Scenario: Track links expose explorer and rehearsal operations

- **WHEN** a user opens the more-options menu for a track link in Files
- **THEN** the menu includes `Play next`, `Add to queue`, `Add to playlist`, `Make loop`, `Create a copy`, `Edit tags`, `Rename`, `Move to folder`, and `Remove`
- **AND** the action-sheet presentation exposes a separate `Cancel` dismissal affordance

#### Scenario: Loop links expose shared loop operations

- **WHEN** a user opens the more-options menu for a loop link in Files
- **THEN** the menu includes `Play next`, `Add to queue`, `Add to playlist`, `Create a copy`, `Edit tags`, `Rename`, `Move to folder`, and `Remove`
- **AND** the action-sheet presentation exposes a separate `Cancel` dismissal affordance

#### Scenario: Files queue actions keep existing playback continuity behavior

- **WHEN** a user chooses `Play next` or `Add to queue` from a track or loop link in Files
- **THEN** the system preserves the same active-queue update behavior used on other queue-capable library surfaces
- **AND** the action does not interrupt the current playback item
- **AND** when playback is currently standalone, the action can still promote that session into the transient queue model defined elsewhere in this change

#### Scenario: Playlist links expose shared organization operations

- **WHEN** a user opens the more-options menu for a playlist link in Files
- **THEN** the menu includes `Create a copy`, `Edit tags`, `Rename`, `Move to folder`, and `Remove`
- **AND** the action-sheet presentation exposes a separate `Cancel` dismissal affordance

#### Scenario: Folder rows expose shared file operations

- **WHEN** a user opens the more-options menu for a folder in Files
- **THEN** the menu includes `Edit tags`, `Rename`, `Move to folder`, and `Remove`
- **AND** the action-sheet presentation exposes a separate `Cancel` dismissal affordance

#### Scenario: Rename and move act on the visible file node or link

- **WHEN** a user chooses `Rename` or `Move to folder` from a Files overflow menu
- **THEN** the system prompts for the new visible name or destination folder before applying the change
- **AND** track, loop, and playlist rename or move changes only the current file link, not the underlying entity or sibling links
- **AND** folder rename or move updates the folder node itself without rewriting metadata on linked tracks, loops, or playlists

#### Scenario: Remove confirms pointer-versus-entity impact

- **WHEN** a user chooses `Remove` for a file link in Files
- **THEN** the system asks for confirmation before applying the removal
- **AND** if other file links remain, the confirmation explains that only the current pointer will be removed
- **AND** if the current link is the last remaining file link, the confirmation explains that the underlying saved entity will also be deleted from the library

### Requirement: Availability feedback stays connection-first for Drive-backed library items

The system SHALL keep Drive-backed library availability feedback progressive: top-level connection state first, then per-item repair actions only when connection is available.

#### Scenario: Disconnected state is surfaced at the top level first

- **WHEN** the app cannot reach the Drive connectivity needed to validate or open linked saved items
- **THEN** Library surfaces show a single top-level connected/disconnected state
- **AND** individual broken-source remediation is not presented as the primary feedback while that connection state is unresolved

#### Scenario: Broken linked items surface per-item recovery only after connectivity is available

- **WHEN** Drive connectivity is available and a saved item's underlying source file has been moved or removed in Drive
- **THEN** that item surfaces an individual issue state
- **AND** the issue state offers `Reconnect` and `Remove from library`

#### Scenario: Reconnect preserves library relationships for a broken source item

- **WHEN** a user chooses `Reconnect` for a broken saved item
- **THEN** the system opens a relink flow for the underlying source file
- **AND** a successful reconnect preserves the saved entity's existing library metadata and file links instead of creating a replacement entity from scratch

#### Scenario: Remove from library deletes all references for a broken source item

- **WHEN** a user chooses `Remove from library` for a broken saved item
- **THEN** the system removes the underlying saved entity and every file link that points to it
- **AND** that action is clearly distinguished from the normal pointer-only `Remove` operation

#### Scenario: Folderless workflow remains supported outside Files

- **WHEN** a user does not want to organize content into folders
- **THEN** the system continues to support complete rehearsal workflows through dedicated library views, tags, and filters

### Requirement: Loop provenance remains visible in standalone organization result views

The system SHALL preserve and display loop parent-track provenance even when loops appear in standalone search, tag, or folder result groups.

#### Scenario: Standalone loop result shows parent linkage

- **WHEN** a loop is displayed in the Files view, a folder result, a search result, or a tag-filtered list
- **THEN** the system shows that loop's parent track identity so users can recover source context quickly

#### Scenario: Search and organization results keep loops visible as a top-level result category

- **WHEN** library search, tag results, or folder results include loops
- **THEN** the system displays loops in their own visible result category
- **AND** the UI does not require a separate enablement step to surface them there
