## MODIFIED Requirements

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

#### Scenario: Show and Tags filters apply to plain Files browsing, not only during search

- **WHEN** a user selects a non-default `Show` entity-type filter or one or more `Tags` filters while Files is the active Library view and no search query is active
- **THEN** the system filters the current folder's visible track, loop, and playlist rows to only those matching the selected filter(s)
- **AND** the active `Sort` mode continues to apply on top of the filtered rows
- **AND** a stale `Show` or `Tags` selection cannot silently have no effect merely because no search is running

#### Scenario: Folders remain reachable while a Show or Tags filter narrows plain Files browsing

- **WHEN** a `Show` or `Tags` filter is active while plain-browsing Files
- **THEN** the system keeps a subfolder visible in the current listing if it recursively contains at least one item matching the active filter(s), or if the subfolder's own tags match the active `Tags` filter
- **AND** the system hides a subfolder that meets neither condition
- **AND** a subfolder that remains visible still opens and lists its own contents under the same active filter(s)

#### Scenario: Active filter state remains visible after closing the filter popover

- **WHEN** a user selects a non-default `Show` filter value or one or more `Tags` filters and then closes the filter popover
- **THEN** the system continues to indicate that a filter is active, both on the filter control itself and via a summary control shown in the browse view
- **AND** this indication is shown regardless of which Library view is currently active, since the underlying filter selection is shared across views
- **AND** selecting the summary control reopens the filter popover

#### Scenario: The search toggle's active-state indication matches the filter toggle's pattern

- **WHEN** a user opens or closes Library search
- **THEN** the search toggle control's filled/active visual state reflects only whether the search bar is currently open
- **AND** this matches how the filter toggle control already varies its filled/active state by whether the filter popover is open or a filter is active

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
- **AND** this filtering applies whether or not a library search query is currently active
