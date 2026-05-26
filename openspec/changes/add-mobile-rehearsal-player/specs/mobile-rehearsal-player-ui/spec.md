## ADDED Requirements

### Requirement: The mobile rehearsal player uses a destination-based shell with persistent playback context

The system SHALL present the mobile rehearsal player through a destination-based navigation shell that keeps discovery, personal library management, and active playback one tap away.

#### Scenario: Active playback remains visible while browsing the app

- **WHEN** playback is active and the user moves between top-level destinations such as Home, Search, or Library
- **THEN** the system keeps a persistent mini-player visible with the current item title, playback state, and a direct entry point into the full now-playing view

#### Scenario: Top-level navigation preserves user context

- **WHEN** a user moves between top-level destinations and returns to a previous destination
- **THEN** the system restores the last meaningful state for that destination such as scroll position, active filters, or the current folder path when practical for the active session

### Requirement: The public library separates discovery from saved practice materials

The system SHALL present Google Drive discovery as a public practice library surface that is visually distinct from the user's saved rehearsal library.

#### Scenario: Discovery highlights browse entry points and recent practice context

- **WHEN** a connected user opens the default discovery destination
- **THEN** the system shows a browse-first layout with quick entry points into My Drive, shared folders, recent listening, and other discovery groupings before the user enters a specific folder or search result set

#### Scenario: Drive browsing keeps source context visible

- **WHEN** a user drills into a Drive folder from the public practice library
- **THEN** the system shows the active source context through breadcrumbs, root labels, or other location indicators so the user can understand where the visible tracks live

### Requirement: Search supports low-friction rehearsal discovery and action

The system SHALL provide a search experience that allows a user to quickly find supported rehearsal audio and act on results without leaving the search context.

#### Scenario: Search results are grouped for fast scanning

- **WHEN** a user searches for a rehearsal item
- **THEN** the system returns results in a scan-friendly layout with clear grouping or filtering for tracks, loops, playlists, folders, or other relevant result types supported in the current product slice

#### Scenario: Search results expose immediate rehearsal actions

- **WHEN** a user views a search result for a supported playable item
- **THEN** the system provides direct actions such as play, save, or add to playlist from the search surface without forcing the user to open a separate management screen first

### Requirement: The personal library organizes saved tracks, loops, and playlists as adjacent collections

The system SHALL provide a personal rehearsal library that keeps saved tracks, saved loops, and playlists in separate but closely related collection views.

#### Scenario: Users can move between collection types without leaving the library destination

- **WHEN** a user opens the personal library
- **THEN** the system provides clear controls to switch between saved tracks, saved loops, and playlists within the same destination

#### Scenario: Library items expose focused management actions

- **WHEN** a user views an item in the personal library
- **THEN** the system shows management actions appropriate to that item type such as play, rename, remove, add to playlist, or edit without overwhelming the row with secondary controls

### Requirement: Loop creation uses a playback-aware marker selection flow

The system SHALL provide a loop creation flow that lets a user select a saved track, capture start and end markers from playback, review the selected range, and save the result as a named loop.

#### Scenario: Users capture loop boundaries from the active track timeline

- **WHEN** a user chooses to create a loop from a saved track
- **THEN** the system presents the active track context, current playback time, marker controls, and a visible summary of the selected start and end positions before the loop is saved

#### Scenario: Loop creation uses a dedicated builder surface

- **WHEN** a user starts loop creation from a saved track row in Library
- **THEN** the system opens a dedicated loop-builder surface for that track so the user can focus on range selection and naming without a persistent builder card taking space in the main library layout

#### Scenario: Loop builder range selection is touch-driven

- **WHEN** a user adjusts the loop builder range selector
- **THEN** the system provides two thumbs for start and end, visible time labels for the selected range, and nearby actions to preview or save the loop from the same surface

#### Scenario: Incomplete or invalid loop markers receive immediate feedback

- **WHEN** a user attempts to save a loop without both markers or with an invalid range
- **THEN** the system keeps the user in the loop creation flow and presents inline guidance explaining how to complete or correct the range

### Requirement: Playlist views support queue-oriented rehearsal management

The system SHALL present playlists through a detail view that makes playback intent, item order, and editing actions easy to understand.

#### Scenario: Playlist detail emphasizes playback and editing

- **WHEN** a user opens a playlist detail view
- **THEN** the system shows playlist metadata, primary playback actions, and the ordered item list before secondary settings or metadata

#### Scenario: Users can edit playlist order from the playlist detail view

- **WHEN** a user enters playlist editing mode
- **THEN** the system allows reordering or removing items directly from the playlist detail view without requiring a separate administrative workflow

### Requirement: The now-playing experience prioritizes transport, progress, and rehearsal context

The system SHALL provide a full now-playing view that foregrounds the active item, playback progress, transport controls, and contextual actions relevant to rehearsal use.

#### Scenario: Mini-player expands into a focused playback view

- **WHEN** a user opens the full now-playing experience from the mini-player or another playback entry point
- **THEN** the system expands into a focused view that clearly shows the active item title, source context, artwork or placeholder artwork, progress, and primary transport controls

#### Scenario: Users can scrub the active timeline from now playing

- **WHEN** a user drags the progress control in the now-playing experience
- **THEN** the system seeks within the active track or saved-loop bounds and updates the visible playback progress without leaving the playback surface

#### Scenario: Users can adjust playback volume without leaving now playing

- **WHEN** a user changes the in-app volume control from the now-playing experience
- **THEN** the system updates the active playback volume while keeping the current rehearsal context visible

#### Scenario: Loop context is visible during loop playback

- **WHEN** the active item is a saved loop
- **THEN** the now-playing experience shows that the item is a loop and surfaces its saved range or other loop-identifying context so the user understands why playback is constrained

### Requirement: The queue is visible and controllable without leaving playback

The system SHALL provide an up-next or queue surface that lets the user inspect and manage upcoming playback items while staying close to the active playback experience.

#### Scenario: Users can inspect upcoming playback from now playing

- **WHEN** a user opens the queue from the now-playing experience
- **THEN** the system shows the current item, the upcoming items in order, and the active repeat or shuffle state in a queue-oriented layout

#### Scenario: Users can adjust queue order during a rehearsal session

- **WHEN** queue editing is supported for the active playback context
- **THEN** the system allows the user to reorder or remove upcoming items from the queue surface without forcing playback to stop

### Requirement: The UI remains touch-friendly, legible, and rehearsal-first

The system SHALL use mobile interaction patterns that stay legible during rehearsal use, including one-handed use, quick scanning, and imperfect lighting or device conditions.

#### Scenario: Primary controls stay easy to tap and read

- **WHEN** a user is interacting with core playback, library, or search actions on a handheld phone
- **THEN** the system presents primary controls with touch-friendly targets, readable hierarchy, and sufficient contrast for the supported visual theme

#### Scenario: Empty or unavailable states still guide the user forward

- **WHEN** a user encounters an empty library, unavailable track, or no-result search state
- **THEN** the system presents recovery-oriented guidance and a nearby next action such as browse, reconnect, save tracks, or clear filters
