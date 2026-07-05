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
- **THEN** the system shows a navigation bar with a back action, the current folder title, and a top-level add action
- **AND** the system shows a breadcrumb bar for the path from Files root to the current folder
- **AND** breadcrumb segments are tappable so users can jump directly to any parent folder

#### Scenario: Files view renders one mixed-entity explorer list

- **WHEN** a user is browsing a folder in Files
- **THEN** the system renders folders, track links, loop links, and playlist links in one vertically scrolling list
- **AND** each row uses a leading entity-type icon, primary text, and a trailing more-options trigger
- **AND** the UI does not split the folder contents into separate cards or section panels by entity type

#### Scenario: Files add action creates current-folder items

- **WHEN** a user opens the Files add action from the current folder
- **THEN** the system offers `Create folder`, `Add tracks from Drive`, and `Create playlist`
- **AND** each action targets the currently visible folder

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

### Requirement: Files organization separates file-tree nodes from underlying saved entities

The system SHALL represent Files hierarchy entries as file-tree nodes so saved tracks, loops, and playlists can behave like standard explorer items without losing their canonical app state.

#### Scenario: One underlying entity can appear in multiple folders

- **WHEN** a user files the same saved track, loop, or playlist in more than one folder
- **THEN** the system creates multiple file links that point to the same underlying entity
- **AND** editing the underlying entity remains visible through every file link

#### Scenario: Renaming a file link affects only that visible pointer

- **WHEN** a user renames a track, loop, or playlist from the Files explorer
- **THEN** the system updates only that file link's visible name
- **AND** the underlying Drive path, saved entity identity, and other file links keep their existing names unless separately renamed

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

### Requirement: Files rows expose standard explorer operations

The system SHALL expose standard explorer operations through row-level overflow menus so users can manage folders and saved-entity links without leaving the current path context.

#### Scenario: Saved entity links expose shared file operations

- **WHEN** a user opens the more-options menu for a track, loop, or playlist link in Files
- **THEN** the menu includes `Edit tags`, `Rename`, `Move to folder`, and `Remove`
- **AND** track links also include `Add to playlist` and `Make loop`
- **AND** loop links also include `Add to playlist`

#### Scenario: Folder rows expose shared file operations

- **WHEN** a user opens the more-options menu for a folder in Files
- **THEN** the menu includes `Edit tags`, `Rename`, `Move to folder`, and `Remove`

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
