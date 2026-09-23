## MODIFIED Requirements

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

#### Scenario: Filter by one or more tags matches all selected tags by default

- **WHEN** a user selects one or more tags in library organization controls and has not changed the tag match mode from its default
- **THEN** the system filters visible saved entities to those that carry every selected tag
- **AND** this filtering applies whether or not a library search query is currently active

#### Scenario: A tag match-mode control lets a user broaden filtering to any selected tag

- **WHEN** one or more tags are selected in library organization controls
- **THEN** the system offers a control to switch the tag match mode between `All` (every selected tag must be present) and `Any` (at least one selected tag must be present)
- **AND** switching to `Any` immediately filters visible saved entities to those that carry at least one selected tag, everywhere the `Tags` filter already applies
- **AND** the tag match mode is a single setting shared across all selected tags, not an individual setting per tag

#### Scenario: Tag match mode is shared state, not reset by clearing search or switching views

- **WHEN** a user sets the tag match mode to `Any` and then switches the active Library view
- **THEN** the tag match mode remains `Any` for the still-selected tags in the new view
- **AND** clearing the active library search resets the tag match mode back to its default `All` value, the same way it already clears `selectedTagFilters`

#### Scenario: Saved tag edits persist and are reflected everywhere tags are shown

- **WHEN** a user commits tag edits for a track, loop, or playlist through the tag editor's save action
- **THEN** the saved tags persist across navigation and app sessions
- **AND** reopening the tag editor for that same entity shows the saved tags rather than an empty state
- **AND** the entity's tags are reflected in the Library `Tags` view's usage counts and in the Recents tag-usage-derived module without requiring an app restart

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

#### Scenario: Files create control does not obscure the current folder's last visible row

- **WHEN** the Files create control's screen position overlaps the vertical space of the current folder's last visible row
- **THEN** the system keeps that row's trailing more-options trigger fully reachable, either by reserving bottom list padding so no row renders underneath the control or by giving the control a hit region that never intercepts taps intended for row controls
- **AND** a tap in that region produces the same result regardless of small pixel-level differences in tap position — either it reliably activates the create control, or it reliably activates the row's own control, never an ambiguous mix of the two

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
