## ADDED Requirements

### Requirement: Tracks, Loops, and Playlists browse order is explicit and user-controlled

The system SHALL expose explicit sort controls for the Tracks, Loops, and Playlists Library views so users can understand and change browse order in each dedicated view, using the same interaction pattern the Tags view's sort control already uses.

#### Scenario: Each dedicated view exposes explicit sort options

- **WHEN** a user opens the Tracks, Loops, or Playlists view
- **THEN** the system offers `Name` and `Date added` as sort fields for that view
- **AND** the default sort is `Name` ascending

#### Scenario: Name sorting is case-insensitive

- **WHEN** Tracks, Loops, or Playlists is sorted by `Name`
- **THEN** the system compares visible names case-insensitively rather than treating case-only differences as distinct alphabetical groups

#### Scenario: Date added sorting reflects when each entity was saved

- **WHEN** Tracks, Loops, or Playlists is sorted by `Date added`
- **THEN** the system orders visible items by the same underlying saved date Files' own `Date added` sort already uses for that entity type
- **AND** the user can toggle between ascending and descending order for that sort field

#### Scenario: Sort applies on top of active search results

- **WHEN** a user has an active search query while viewing Tracks, Loops, or Playlists
- **THEN** the visible, filtered result ordering continues to follow the currently selected sort field and direction for that view
- **AND** the app does not silently switch to a hidden alternate ordering model

#### Scenario: Sort selection does not persist across view switches

- **WHEN** a user changes sort field or direction in Tracks, Loops, or Playlists and then switches to a different Library view and back
- **THEN** the sort control for that view resets to its default (`Name` ascending)

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

#### Scenario: The Files-only Show filter resets when switching views without an active search

- **WHEN** a user has selected a non-default `Show` filter value while Files is the active Library view, has no active search query, and then switches to a different Library view
- **THEN** the system resets the `Show` filter back to its default value
- **AND** a stale `Show` filter value from Files cannot silently suppress results in Tracks, Loops, or Playlists
