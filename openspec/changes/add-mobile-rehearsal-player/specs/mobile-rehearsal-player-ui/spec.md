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

Companion mockup states: Screen 3 shows the row-level More Options affordance that can launch the playlist add flow without leaving search context.

#### Scenario: Search results are grouped for fast scanning

- **WHEN** a user searches for a rehearsal item
- **THEN** the system returns results in a scan-friendly layout with clear grouping or filtering for tracks, loops, playlists, folders, or other relevant result types supported in the current product slice

#### Scenario: Search and library rows expose immediate rehearsal actions

- **WHEN** a user views a supported track row or other playable item on Search or Library surfaces
- **THEN** the system provides direct actions such as play, save, or a More Options affordance that can open item-specific management without forcing the user to open a separate management screen first

### Requirement: The personal library organizes saved tracks, loops, and playlists as adjacent collections

The system SHALL provide a personal rehearsal library that keeps saved tracks, saved loops, and playlists in separate but closely related collection views.

Companion mockup states: Screen 4 shows the library collection layout and row-level More Options affordances that feed the playlist-management flow.

#### Scenario: Users can move between collection types without leaving the library destination

- **WHEN** a user opens the personal library
- **THEN** the system provides clear controls to switch between saved tracks, saved loops, and playlists within the same destination

#### Scenario: Library items expose focused management actions

- **WHEN** a user views an item in the personal library
- **THEN** the system shows management actions appropriate to that item type such as play, rename, remove, add to playlist, or edit without overwhelming the row with secondary controls

### Requirement: Track rows use a context-menu playlist add flow

The system SHALL let a user start playlist assignment from a `TrackListItem` via a local context menu that behaves like a mobile music-app bottom sheet.

Companion mockup states: Screen 4A is the Track Context Sheet, Screen 4B is the Playlist Selector Modal, and Screen 4C is the New Playlist Prompt used by this flow.

#### Scenario: Open the track context menu from a row

- **WHEN** a user taps the More Options icon on a `TrackListItem`
- **THEN** the system runs `openTrackContextMenu` and presents a bottom sheet that shows the track metadata and an `initiateAddToPlaylist` action

#### Scenario: Open the playlist selector overlay from the context menu

- **WHEN** a user chooses `initiateAddToPlaylist` from the track context menu
- **THEN** the system opens a playlist selector modal as an overlay with a vertically scrolling list of available `Playlist` entities

#### Scenario: Assign the track to an existing playlist from the selector modal

- **WHEN** a user selects a playlist in the selector modal
- **THEN** the system runs `assignToExistingPlaylist`, dismisses the modal, and shows a success toast while keeping the user in the originating library or search context

#### Scenario: Create a playlist during the add flow

- **WHEN** a user chooses `createNewPlaylist`, enters a `PlaylistName`, and submits
- **THEN** the system creates the playlist, assigns the selected track, dismisses the modal, and shows a success toast

### Requirement: Loop creation uses a playback-aware marker selection flow

The system SHALL provide a loop creation flow that lets a user select a saved track, capture start and end markers from playback, review the selected range, and save the result as a named loop.

#### Scenario: Users capture loop boundaries from the active track timeline

- **WHEN** a user chooses to create a loop from a saved track
- **THEN** the system presents the active track context, current playback time, marker controls, and a visible summary of the selected start and end positions before the loop is saved

#### Scenario: Loop creation uses a dedicated builder surface

- **WHEN** a user starts loop creation from a saved track row in Library
- **THEN** the system opens a dedicated loop-builder surface for that track so the user can focus on range selection and naming without a persistent builder card taking space in the main library layout

#### Scenario: Loop builder range selection is touch-driven

- **WHEN** a user adjusts the loop builder dual-thumb range slider
- **THEN** the system provides two thumbs for start and end, visible time labels for the selected range, and nearby actions to preview or save the loop from the same surface

#### Scenario: Incomplete or invalid loop markers receive immediate feedback

- **WHEN** a user attempts to save a loop without both markers or with an invalid range
- **THEN** the system keeps the user in the loop creation flow and presents inline guidance explaining how to complete or correct the range

### Requirement: Playlist detail uses queue-first mobile management patterns

The system SHALL present each playlist through a detail view that foregrounds `PlaylistName`, `TotalTrackCount`, a primary `PlayAll` floating action button, the ordered item list, and the local actions needed to manage rehearsal playback.

Companion mockup states: Screen 6 State A shows the playback-first detail view, Screen 6 State B shows the playlist item menu plus undo snackbar feedback, and Screen 6 State C shows the dedicated edit mode.

#### Scenario: Playlist header emphasizes playback intent

- **WHEN** a user opens a playlist detail view
- **THEN** the system shows `PlaylistName`, `TotalTrackCount`, and a primary `PlayAll` floating action button before secondary playlist metadata or settings

#### Scenario: Tapping a playlist row starts playback from that position

- **WHEN** a user taps a `TrackListItem` in the playlist detail view
- **THEN** the system starts playback from that item and keeps the subsequent items from that playlist queued according to that playlist's saved indexes

#### Scenario: Remove a playlist item from its local context menu

- **WHEN** a user triggers `removeFromPlaylist` from a track's local context menu in the playlist detail view
- **THEN** the system removes the item immediately from the visible playlist and shows a `Snackbar` with an `undoAction` that can restore the removed item without leaving the detail view

#### Scenario: Enter playlist edit mode from the header

- **WHEN** a user chooses `enableEditMode` from the playlist detail header
- **THEN** the list transitions into `EditState` without leaving the playlist detail view

#### Scenario: Edit mode swaps playback affordances for reorder and removal controls

- **WHEN** the playlist detail view is in `EditState`
- **THEN** the system replaces row playback icons with drag handles that run `updateTrackIndex` and destructive controls that run `removeTrack`

#### Scenario: Save playlist edits and exit edit mode

- **WHEN** a user runs `saveEdits`
- **THEN** the system commits the updated playlist order, exits `EditState`, and returns the list to its playback-oriented presentation

### Requirement: Playlist management UI state remains decoupled from playback transport

The system SHALL keep bottom sheets, selector overlays, `EditState`, toasts, and snackbars in UI-local state models that call playlist-domain operations without storing presentation state inside the core audio playback engine.

Companion mockup states: Screen 4A through Screen 4C and Screen 6 State B through State C represent UI-local management states that should remain separate from persisted playback transport state.

#### Scenario: Playlist management surfaces do not hijack active playback

- **WHEN** a user opens a context menu, selector modal, or edit mode while playback is already active
- **THEN** the system preserves the current transport state and scopes the management UI to the current screen until the user explicitly starts a new playback action or commits a playlist mutation

#### Scenario: Playback is rebuilt from persisted playlist order, not transient UI state

- **WHEN** a user taps `PlayAll`, taps a playlist item, or reopens a playlist after dismissing its management surfaces
- **THEN** the system builds playback from the persisted playlist membership order instead of from temporary bottom-sheet, modal, toast, snackbar, or `EditState` values

### Requirement: The now-playing experience prioritizes transport, progress, and rehearsal context

The system SHALL provide a full now-playing view that foregrounds the active item, playback progress, transport controls, and contextual actions relevant to rehearsal use.

#### Scenario: Mini-player expands into a focused playback view

- **WHEN** a user opens the full now-playing experience from the mini-player or another playback entry point
- **THEN** the system expands into a focused view that clearly shows the active item title, source context, a waveform visualization or simple waveform placeholder, progress, and primary transport controls

#### Scenario: Users can scrub the active timeline from now playing

- **WHEN** a user drags the progress scrubber slider in the now-playing experience
- **THEN** the system seeks within the active track or saved-loop bounds and updates the visible playback progress without leaving the playback surface

#### Scenario: Users can adjust playback volume without leaving now playing

- **WHEN** a user changes the speaker-annotated volume slider from the now-playing experience
- **THEN** the system updates the active playback volume and the visible speaker or mute state while keeping the current rehearsal context visible

#### Scenario: Loop context is visible during loop playback

- **WHEN** the active item is a saved loop
- **THEN** the now-playing experience shows that the item is a loop and surfaces its saved range or other loop-identifying context so the user understands why playback is constrained

### Requirement: Playback and library controls use consistent music icon semantics

The system SHALL use a consistent, platform-familiar music icon vocabulary across transport, queue, library management, and playback state surfaces.

Companion mockup states: Screen 3 and Screen 4 show row-level More Options affordances, Screen 6 State C shows drag handles replacing playback icons during edit mode, Screen 7 shows transport, queue, and volume controls, and Screen 8 shows repeat and shuffle state.

#### Scenario: Transport and queue controls use familiar music-player icons

- **WHEN** a user views the mini-player, now-playing, or queue controls
- **THEN** the system uses platform-standard icons for play or pause, previous, next, queue, shuffle, repeat, and speaker volume or mute states, and only the icon matching the current state is shown as active

#### Scenario: Icon-only controls remain understandable and accessible

- **WHEN** a control relies on an icon without adjacent body text
- **THEN** the system provides an accessible action label and exposes selected, disabled, or muted state through visible styling or nearby state text instead of color alone

#### Scenario: Playback, management, and destructive actions stay visually distinct

- **WHEN** a user views rows on Search, Library, playlist detail, or queue surfaces
- **THEN** the system uses distinct icons for playback, More Options, drag handles, and destructive removal so management actions do not visually masquerade as transport controls

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
