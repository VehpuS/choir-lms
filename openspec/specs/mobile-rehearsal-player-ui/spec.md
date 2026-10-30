# mobile-rehearsal-player-ui Specification

## Purpose

TBD - created by archiving change add-mobile-rehearsal-player. Update Purpose after archive.

## Requirements

### Requirement: The mobile rehearsal player uses a destination-based shell with persistent playback context

The system SHALL present the mobile rehearsal player through a destination-based navigation shell that keeps discovery, personal library management, and active playback one tap away while a shared audio engine persists playback state across the app.

#### Scenario: Active playback remains visible while browsing the app

- **WHEN** an active track or saved loop is loaded in the audio engine and the user moves between top-level destinations such as Home, Search, or Library
- **THEN** the system keeps a persistent mini-player visible above the bottom navigation bar with the current item identity, current playback state, and a direct entry point into the dedicated playback screen

#### Scenario: Playback state stays shared across entry points

- **WHEN** playback changes to playing, paused, or buffering from any screen or transport entry point
- **THEN** the mini-player, dedicated playback screen, and any queue surfaces reflect the same shared audio-engine state without unloading or restarting the active item

#### Scenario: Top-level navigation preserves user context

- **WHEN** a user moves between top-level destinations and returns to a previous destination
- **THEN** the system restores the last meaningful state for that destination such as scroll position, active filters, or the current folder path when practical for the active session

### Requirement: The mini-player uses a waveform-first rehearsal summary

The system SHALL present the mini-player as a horizontal container fixed above the main navigation bar whenever the audio engine has an active track or loop loaded.

Companion mockup states: design screens 1a–1e show the mini-player and tab bar as one band, with the mini waveform, context line, accent-ring play / pause, and accent progress line.

#### Scenario: Waveform replaces square artwork in the mini-player

- **WHEN** the mini-player renders the active item
- **THEN** the system shows a simplified, non-interactive waveform for the current stem instead of a square artwork thumbnail, truncates the track title with an ellipsis, and shows part or section metadata only when it is available

#### Scenario: The mini-player waveform comes from the same real peaks as the playback surface

- **WHEN** the mini-player renders its waveform
- **THEN** the shape is downsampled from the same peak data the dedicated playback screen uses for that item, and while peaks are unavailable it renders the same neutral placeholder band rather than a synthetic shape

#### Scenario: The mini-player context line reflects loop and shaping state

- **WHEN** the active item is a loop, or non-default speed or pitch shaping is active
- **THEN** the mini-player's muted context line shows the loop range and the active speed and pitch values in fixed-width numerals

#### Scenario: Mini-player progress is a line, not a scrubber

- **WHEN** the mini-player is visible during playback
- **THEN** the system shows playback progress as a thin accent line along the mini-player's edge that stays in sync with the dedicated playback screen's playhead and is not itself interactive

#### Scenario: Overflowing mini-player titles animate only during active playback

- **WHEN** the active title exceeds the available mini-player text width
- **THEN** the system keeps the title statically truncated unless playback is actively playing, and only then may it use a marquee treatment

#### Scenario: Mini-player body opens the dedicated playback screen

- **WHEN** a user taps anywhere on the mini-player outside the play / pause control
- **THEN** the system opens the dedicated playback screen with a modal slide-up transition

#### Scenario: Mini-player transport stays local to the compact surface

- **WHEN** a user taps the right-aligned play / pause control in the mini-player
- **THEN** the system toggles playback without leaving the current route

#### Scenario: The mini-player appears while the active item is still loading

- **WHEN** a user starts a track, loop, playlist, or queue whose first item still has to load (on web, the whole Drive file downloads before it can play)
- **THEN** the mini-player appears at once for that item with a loading indicator in place of the play / pause glyph, and its context line reports loading progress as a percentage when the size is known, changing to a slow-connection notice once loading has taken more than a few seconds
- **AND** a started playlist or queue is current immediately, so Up Next, previous / next, repeat, shuffle, and `Play next` / `Add to queue` are available without waiting for that item to load
- **AND** starting a different item or queue position while an item is loading replaces the load rather than being blocked, and the replaced load reports no error

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

The system SHALL provide a loop editor that lets a user select a saved track, mark a start and end on the track's own waveform, preview the range, review it, and save the result as a named loop. The loop editor is the one place a full-screen waveform appears (screen 1g).

#### Scenario: Users capture loop boundaries from the active track timeline

- **WHEN** a user chooses to create a loop from a saved track
- **THEN** the system presents the track's waveform in full, the loop as a region between an `A` and a `B` handle, the preview position as a playhead, and a visible summary of the start, length, and end before the loop is saved

#### Scenario: The loop editor is a dedicated full-screen surface with several entry points

- **WHEN** a user chooses `Make loop` for a saved track, `Edit loop` for a saved loop, or taps the loop chip on the playback sheet while a saved loop is active
- **THEN** the system opens the loop editor for that track, in edit mode for an existing loop, without requiring playback to stop and without closing the playback sheet beneath it
- **AND** saving or closing the editor returns the user to where they were, with audio and position undisturbed

#### Scenario: Loop range selection is touch-driven on the waveform

- **WHEN** a user drags the `A` or `B` handle, or nudges either edge with the minus and plus controls of the start and end cards
- **THEN** the region follows, the start, length, and end read out in tenths of a second, a handle cannot cross the other or leave the track, and dragging and nudging land on the same grid
- **AND** holding a nudge control repeats it, and each handle offers increment and decrement actions to assistive technology

#### Scenario: The preview transport sits beside the editor

- **WHEN** the loop editor is open
- **THEN** the system offers preview play / pause, jumps of fifteen seconds within the previewed range, and `Set start here` / `Set end here` from the preview position, from the same surface as `Save loop`

#### Scenario: Incomplete or invalid loop markers receive immediate feedback

- **WHEN** a user attempts to save a loop without both markers or with an invalid range
- **THEN** the system keeps the user in the loop editor and presents inline guidance explaining how to complete or correct the range

### Requirement: Playlist detail uses queue-first mobile management patterns

The system SHALL present each playlist through a detail view that foregrounds `PlaylistName`, `TotalTrackCount`, a primary `PlayAll` floating action button, the ordered item list, and the local actions needed to start playback or manage playlist membership. Ongoing queue-mode controls such as repeat and shuffle belong to the dedicated playback and queue surfaces once playback is active.

Companion mockup states: Screen 6 State A shows the playback-first detail view, Screen 6 State B shows the playlist item menu plus undo snackbar feedback, and Screen 6 State C shows the dedicated edit mode.

#### Scenario: Playlist header emphasizes playback intent

- **WHEN** a user opens a playlist detail view
- **THEN** the system shows `PlaylistName`, `TotalTrackCount`, and a primary `PlayAll` floating action button before secondary playlist metadata or settings

#### Scenario: Tapping a playlist row starts playback from that position

- **WHEN** a user taps a `TrackListItem` in the playlist detail view
- **THEN** the system starts playback from that item and keeps the subsequent items from that playlist queued according to that playlist's saved indexes

#### Scenario: Playlist detail defers queue-mode controls to playback surfaces

- **WHEN** a user is viewing playlist detail before or during queued playback
- **THEN** the system keeps repeat and shuffle controls on the dedicated playback modal or queue surface instead of treating playlist detail as the place to change the active queue mode

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

### Requirement: The dedicated playback screen prioritizes waveform scrubbing, transport, and rehearsal context

The system SHALL provide a full-screen playback modal that slides up from the bottom and foregrounds a SoundCloud-style waveform, rehearsal-oriented transport controls, and contextual track information for metadata-poor stems.

Companion mockup states: design screen 1f shows the playback sheet with the practice row, screen 1g shows the full-screen loop editor that playback can enter to edit a loop, screen 1i shows the shaping surface reached from the sheet, and screen 1h shows the queue sheet.

#### Scenario: Mini-player expands into a slide-up playback modal

- **WHEN** a user opens the dedicated playback screen from the mini-player or another playback entry point
- **THEN** the system presents a full-screen modal that slides up from the bottom, includes a swipe-down chevron or pill plus the playback status (`Playing` or `Paused`) in its header, and keeps audio playback uninterrupted during the transition

#### Scenario: The playback surface is one practice sheet, and a full-screen waveform exists only for editing

- **WHEN** a user opens the dedicated playback screen
- **THEN** the system presents one sheet carrying track identity, rehearsal context, a scrubbable waveform timeline, transport, and the practice controls, with no control that only enlarges the waveform
- **AND** a full-screen waveform appears only as part of an editing task such as creating or editing a loop, which the user enters through that task's own action and leaves by saving or cancelling, without interrupting audio or losing the current position

#### Scenario: Waveform is the dominant interactive hero

- **WHEN** the dedicated playback screen is visible
- **THEN** the system shows an interactive waveform for the entire active item instead of square artwork, colors the played portion with an active state from left to right, renders the unplayed portion in a muted state, and lets the user scrub by dragging horizontally across the waveform itself

#### Scenario: The waveform is derived from the actual audio

- **WHEN** the system renders a waveform for an item
- **THEN** its shape comes from peak data derived from that item's own audio, so two different items do not render the same shape
- **AND** while peak data for an item is not yet available, the system renders a neutral placeholder band rather than a synthetic waveform shape, so the interface never implies analysis it does not have

#### Scenario: Playback controls keep rehearsal skip jumps available

- **WHEN** a user views the primary transport row on the dedicated playback screen
- **THEN** the system keeps skip-back and skip-forward controls for rehearsal jumps such as 10 or 15 seconds adjacent to play / pause so current-item rehearsal navigation remains available

#### Scenario: The practice row exposes speed and pitch and reaches the shaping surface

- **WHEN** the dedicated playback screen is visible
- **THEN** the system shows the active speed and pitch values alongside the repeat and queue-mode controls, and provides a control that opens the full shaping surface
- **AND** the row contains no pitch-lock affordance

#### Scenario: Queued playback exposes both current-item and queue navigation

- **WHEN** the active item belongs to a playlist or other queued playback context
- **THEN** the dedicated playback screen additionally shows previous-item and next-item controls while keeping skip-back / play-pause / skip-forward controls available for the current item

#### Scenario: Queued playback keeps repeat and shuffle adjustable after playback starts

- **WHEN** the active item belongs to a playlist or other queued playback context
- **THEN** the dedicated playback modal or adjacent queue surface exposes repeat and shuffle controls for the active queue so the user can change session behavior after playback has already started

#### Scenario: Standalone playback keeps current-item repeat available

- **WHEN** the active item is playing outside any playlist or queue
- **THEN** the dedicated playback screen exposes repeat controls for the current track or saved loop so the user can keep repeating that item without requiring playlist context

#### Scenario: Standalone playback hides queue-only controls

- **WHEN** the active item is playing outside any playlist or queue
- **THEN** the dedicated playback screen omits previous-item, next-item, and other queue-only controls while keeping current-item rehearsal skip controls available

#### Scenario: Track identity stays legible without album artwork

- **WHEN** the dedicated playback screen renders the active item
- **THEN** the system shows a large track title and subtitle such as the stem part or section name, plus loop or source context when relevant, without relying on square artwork to identify the item

#### Scenario: Users can adjust playback volume without leaving the dedicated playback screen

- **WHEN** a user changes the speaker-annotated volume slider from the dedicated playback screen
- **THEN** the system updates the active playback volume and the visible speaker or mute state while keeping the current rehearsal context visible

#### Scenario: Loop context is visible during loop playback

- **WHEN** the active item is a saved loop
- **THEN** the dedicated playback screen shows that the item is a loop and surfaces its saved range or other loop-identifying context so the user understands why playback is constrained

#### Scenario: Swiping down dismisses playback without interrupting audio

- **WHEN** a user swipes down anywhere on the dedicated playback screen
- **THEN** the system dismisses the modal back to the mini-player while preserving the current playback state and active item

### Requirement: Playback and library controls use consistent music icon semantics

The system SHALL use a consistent, platform-familiar music icon vocabulary across transport, queue, library management, and playback state surfaces.

Companion mockup states: Screen 3 and Screen 4 show row-level More Options affordances, Screen 6 State C shows drag handles replacing playback icons during edit mode, Screen 7 shows transport, queue, and volume controls, and Screen 8 shows repeat and shuffle state.

#### Scenario: Transport and queue controls use familiar music-player icons

- **WHEN** a user views the mini-player, dedicated playback screen, or queue controls
- **THEN** the system uses platform-standard icons for play or pause, skip backward, skip forward, previous item, next item, queue, shuffle, repeat, and speaker volume or mute states, keeps current-item skip controls visually distinct from queue-navigation controls, and only shows previous-item, next-item, or queue affordances when the active playback context actually supports queued navigation

#### Scenario: Icon-only controls remain understandable and accessible

- **WHEN** a control relies on an icon without adjacent body text
- **THEN** the system provides an accessible action label and exposes selected, disabled, or muted state through visible styling or nearby state text instead of color alone

#### Scenario: Playback, management, and destructive actions stay visually distinct

- **WHEN** a user views rows on Search, Library, playlist detail, or queue surfaces
- **THEN** the system uses distinct icons for playback, More Options, drag handles, and destructive removal so management actions do not visually masquerade as transport controls

#### Scenario: Repeat and shuffle controls remain visually distinct from each other

- **WHEN** a user views repeat and shuffle controls together on the dedicated playback screen or the queue surface
- **THEN** the system uses a dedicated repeat glyph for every repeat state (off, one, all) and a dedicated, different crossing-arrows glyph reserved exclusively for shuffle
- **AND** the inactive or "off" state of the repeat control does not reuse the shuffle glyph, so a user cannot mistake repeat-off for shuffle-on at a glance
- **AND** each control's active/selected state is conveyed through styling (fill, tint, or outline) on that control's own dedicated glyph, not by borrowing another control's icon shape

#### Scenario: Drag handles use one consistent icon and edge placement across reorderable surfaces

- **WHEN** a user views reorderable rows on playlist detail and on the active queue / Up Next surface
- **THEN** both surfaces use the same drag-handle icon
- **AND** both surfaces place the drag handle at the same edge of the row (leading or trailing) relative to the row's other controls
- **AND** a user who has learned the reorder gesture on one surface recognizes the same affordance on the other without relearning its icon or position

### Requirement: The queue is visible and controllable without leaving playback

The system SHALL provide an up-next or queue surface that lets the user inspect and manage upcoming playback items while staying close to the active playback modal.

#### Scenario: Users can inspect upcoming playback from the dedicated playback screen

- **WHEN** a user opens the queue from the dedicated playback screen
- **THEN** the system shows the current item, the upcoming items in order, and the active repeat or shuffle state in a queue-oriented layout

#### Scenario: Users can update queue mode from playback context

- **WHEN** a user changes repeat or shuffle while viewing the queue surface for an active playlist session
- **THEN** the system applies that mode change to the active queue without requiring the user to return to playlist detail

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

### Requirement: The mobile app renders on the Nocturne design system

The system SHALL take every color, type, radius, spacing, and elevation value from the Nocturne token set, and SHALL NOT hard-code visual values at call sites.

Companion mockup states: design screens 1a–1j show every affected surface on these tokens.

#### Scenario: Tokens are the single source of visual values

- **WHEN** any screen or component renders
- **THEN** its colors, radii, spacing, type sizes, weights, and elevation come from the shared token module, and no raw color literal appears in application source outside that module

#### Scenario: The interface uses the dark near-neutral ground and tonal ramps

- **WHEN** a user views any destination, sheet, or dialog
- **THEN** the system renders on the Nocturne dark ground with surfaces, borders, and muted text taken from the neutral tonal ramp, and keeps chroma low outside the accent

#### Scenario: The accent is used as a line and a glow, never as a flood

- **WHEN** the system presents a primary action, an active state, or a played-progress indication
- **THEN** it expresses that accent as an outline, a short mark, a line, or an ambient glow rather than filling a large area with the accent color

#### Scenario: Elevation is an edge plus ambient darkness

- **WHEN** a card, sheet, header, or dialog is elevated above its ground
- **THEN** the system expresses that elevation as a hairline edge from the neutral ramp plus restrained ambient darkness, and does not stack heavy shadows

#### Scenario: Type carries hierarchy in the absence of artwork

- **WHEN** the system lists tracks, loops, playlists, folders, or Drive files
- **THEN** each row leads with an icon and a medium-weight title over a smaller muted metadata line, uses a fixed-width numeric treatment for durations and time ranges, and does not reserve or fake album artwork

#### Scenario: Headings stay at their specified weight

- **WHEN** the system renders a screen title, section heading, or card title
- **THEN** it conveys hierarchy through size and space rather than by bolding headings past the design system's heading weight

#### Scenario: Headers leave the most room for content

- **WHEN** a user views any destination or any view within a destination
- **THEN** the destination header shows only its large title and trailing actions, with no kicker above the title, the same way on every destination
- **AND** any view or section header above a list is at most one compact line that does not restate the destination title or the selected view, so the first content row starts as high as the controls above it allow

#### Scenario: Icons come from one specified family

- **WHEN** any icon renders
- **THEN** it comes from the Phosphor icon set, uses the filled weight only where a filled glyph is specified, and keeps the existing icon-semantics distinctness requirements satisfied within that family

#### Scenario: Contrast and touch targets hold on the dark ground

- **WHEN** any text or interactive control renders on the Nocturne ground or a Nocturne surface
- **THEN** body and meta text meets at least 4.5:1 contrast against its background, only headline-scale type may rely on the 3:1 large-text threshold, and every interactive control keeps a hit area of at least 44 × 44 pt even when its visual mark is smaller
- **AND** the base accent is not used for body-size text on the dark ground; body-size accent text uses the lighter accent step (`accent-300`)

### Requirement: Surfaces without a companion mockup adopt the Nocturne primitives without behavior change

The system SHALL render every surface that has no companion mockup state in screens 1a–1j by composing the same Nocturne primitives the mocked surfaces use, and SHALL NOT change that surface's behavior, copy, or placement as part of the restyle.

Companion mockup states: none of these surfaces has its own state. Closest references: design screen 1e (Drive rows, save acknowledgment), 1h (pinned two-action footer), and 1j (kickers, segmented controls, chips).

#### Scenario: Primary actions everywhere are accent outlines

- **WHEN** a surface presents a primary action such as `Continue`, `Confirm import`, `Cancel import`, `Dismiss`, `Retry failed`, `Play all`, `Save loop`, or `Update playlist`
- **THEN** the system renders it as an accent-outlined action and renders its secondary actions as neutral outlines, rather than filling the control with an accent or legacy brand color

#### Scenario: Drive search selection mode is restyled without reducing it

- **WHEN** a user enters selection mode from Drive search results in Add
- **THEN** each selectable folder and audio row shows its selected or unselected state with a dedicated glyph plus the row's active title treatment rather than color alone, and the selection count, `Select all` (which becomes `Deselect all` once every loaded result is selected), `Cancel`, `Continue`, and `Edit Selection` controls remain present with their existing behavior
- **AND** folder results and audio results keep their containing Drive path on the row's muted meta line, with matched query text highlighted as in design screen 1j

#### Scenario: Browsing from a folder search result keeps its return action

- **WHEN** a user opens a folder from Drive search results
- **THEN** the explorer header shows the `Search results` return action as a distinct control from parent-folder back navigation, styled as a secondary header action on the Nocturne tokens

#### Scenario: Drive import review, progress, and completion use the shared primitives

- **WHEN** a user reviews, runs, or finishes a bulk Drive import
- **THEN** the destination picker, `Preserve structure` / `Flatten` choice, summary counts, phased progress with completed and total work, and completion summary with per-outcome counts and failed-item reasons render with kickers, rows, segmented or chip controls, a pinned action footer, and monospaced numeric counts from the Nocturne token set
- **AND** progress is shown as an accent line or ring rather than a filled accent block

#### Scenario: Original-location actions and feedback use the shared primitives

- **WHEN** a user opens the options menu for a saved track and chooses `Show in Add` or `Open in Google Drive`
- **THEN** the menu shows the track's `From <path>` provenance as a muted meta line, shows the `Checking Drive…` pending state and any unresolved-location issue through the shared status-card primitive, and keeps both actions in their existing menu section and order

#### Scenario: Every Drive row in Add offers its actions from an overflow menu

- **WHEN** a user views a folder's audio rows in Add, in browse or search results
- **THEN** each audio row keeps its preview play control and its `Save` action, which becomes a `Saved` toggle once saved (pressing it starts removal behind the existing confirmation) at the same fixed width in every state, and also shows an overflow control on every row, not only saved ones
- **AND** the overflow menu is titled with the file's full, untruncated name and offers preview playback, `Save to Library` or `Remove from library`, and `Open in Google Drive`, which opens that file's own Google Drive page
- **AND** a row whose file is not a supported audio format shows that reason on its meta line, offers no playback or save control, and still offers `Open in Google Drive`

#### Scenario: Playlist detail play actions match the Tracks view pattern

- **WHEN** a user views playlist detail
- **THEN** its icon-first ordered-play and shuffle-play actions render as the same paired accent-outline and neutral-outline actions used for `Play all` / `Shuffle` in design screen 1c, inside playlist detail rather than in the shared app bar

### Requirement: Every action responds at once and loading never moves the interface

The system SHALL acknowledge every tap, press, and selection in the same frame, whatever work follows, and SHALL show waiting as a loading state in place rather than as silence, a delayed screen change, or content that shifts the interface.

#### Scenario: A tap changes the screen before its data arrives

- **WHEN** a user taps something that opens a destination, sheet, editor, or folder whose content must be fetched, resolved, or analyzed
- **THEN** the new surface appears in the same frame with its identity (title, path, controls) already in place, and its content area shows a loading state until the content arrives
- **AND** the interface is never left unchanged while the work runs

#### Scenario: A loading indicator lasts exactly as long as the work

- **WHEN** an action involves several stages, such as a metadata request followed by a download followed by analysis
- **THEN** the loading indicator stays visible from the first stage until the last completes, and is replaced by the result
- **AND** no warning, empty state, or placeholder appears in between that the result would then contradict

#### Scenario: Loading is shown in place and does not shift or hide navigation

- **WHEN** a surface is loading
- **THEN** the indicator occupies the area that will hold the content, or a fixed slot, and does not insert a card or banner that moves the navigation, breadcrumbs, or the content the user is aiming at
- **AND** the navigation controls stay visible and operable throughout, and loading text is brief and replaces itself rather than stacking

#### Scenario: A new location never shows the old location's content

- **WHEN** a user navigates from one location to another
- **THEN** the previous location's rows are not shown under the new location's title; the area shows a loading state, or content already held for the new location

#### Scenario: Content already seen appears first and refreshes behind

- **WHEN** a user returns to a location whose content was loaded earlier in the session
- **THEN** that content appears immediately and any refresh happens behind it without clearing it

### Requirement: Drive search reports one stable status line and implies its scope by position

The system SHALL show a Drive search's progress and result summary as one line in a fixed place above the results, and SHALL place the search field below the Drive root switcher so the scope it searches is implied rather than restated.

#### Scenario: The summary stays at the top whether or not discovery has finished

- **WHEN** a Drive search has returned its first results
- **THEN** a single summary line above the first row states how many folders and tracks matched, in the same form while discovery is running and after it ends
- **AND** while discovery is running the line carries a small inline indicator, and when it ends the indicator disappears without the line or the list moving

#### Scenario: No separate loading card appears during or after a search

- **WHEN** a Drive search is running, finishes, or ends incomplete
- **THEN** the interface inserts no card or banner that moves the list; an incomplete or failed discovery is a short reason and a retry within the same summary line
- **AND** the first-load state before any result exists uses the same fixed slot

#### Scenario: The search field implies its scope

- **WHEN** a user views Add with the search field open
- **THEN** the field appears below the `My Drive` / `Shared folders` switcher and no helper line above it repeats the scope
- **AND** the field's accessible name still states the scope for screen readers

### Requirement: Interface copy is written in sentence case

The system SHALL write all interface text in sentence case, capitalizing only the first word and proper names.

#### Scenario: Labels, titles, and messages use sentence case

- **WHEN** the interface shows a button, menu action, title, heading, chip, placeholder, status message, or accessibility label
- **THEN** only its first word and any proper name in it are capitalized
- **AND** proper names are the product's destinations (`Library`, `Add`, `Recents`), Google's names (`Google Drive`, `My Drive`), and names supplied by the user or a file

#### Scenario: All-caps text is styling only

- **WHEN** a kicker or eyebrow is shown in capitals
- **THEN** its source text is sentence case and the capitals come from the text style, so the copy is identical in tests and to assistive technology

#### Scenario: A new copy violation fails validation

- **WHEN** a change adds interface copy with consecutive capitalized words that are not proper names
- **THEN** the project's validation fails until the copy is corrected or the proper name is added to the reviewed allowlist

### Requirement: The playback screen shows the current item's lyrics

The dedicated playback screen SHALL include a `Lyrics` section for the playing item, resolved through the owning track. With lyrics it SHALL show `View` and `Edit`, and, when the window is tall enough to leave room under the controls, a fixed-height window of about four lines that the user can scroll through the full text; on a shorter window it SHALL show only `View` and `Edit`. Without lyrics it SHALL show `Add lyrics`. The section SHALL NOT scroll by itself, highlight, or otherwise track playback position, and it SHALL NOT change the position of the waveform or transport controls when it loads or changes.

#### Scenario: A track with lyrics

- **WHEN** a track with lyrics is playing
- **THEN** the Lyrics section shows a scrollable window of the lyrics with `View` and `Edit` (only `View` and `Edit` on a short window), and the waveform and transport stay where they were

#### Scenario: A track without lyrics

- **WHEN** a track without lyrics is playing
- **THEN** the Lyrics section shows `Add lyrics`, which opens the lyrics editor

#### Scenario: Lyrics follow the current item

- **WHEN** playback moves to a different track
- **THEN** the section shows that track's lyrics (or the empty state) without a layout jump

### Requirement: Lyrics can be peeked from the mini-player and read full screen

The mini-player SHALL show a `Lyrics` control only while the playing item has lyrics. The control SHALL open a half-height peek over the current screen with `Expand` and `Edit`. Reading mode SHALL be a full-screen view of the lyrics with a close control and a four-step text-size control (`Small`, `Medium`, `Large`, `Extra large`) whose choice is remembered on the device and applied to the playback section, the peek, and reading mode. Reading mode SHALL use the Nocturne tokens for a dim-friendly high-contrast text column, SHALL keep playback controls reachable, and SHALL NOT scroll automatically.

#### Scenario: Peek from the mini-player

- **WHEN** a user taps `Lyrics` on the mini-player while a track with lyrics plays
- **THEN** a half-height peek shows the lyrics over the current screen and playback continues

#### Scenario: No dead control

- **WHEN** the playing item has no lyrics
- **THEN** the mini-player shows no `Lyrics` control

#### Scenario: Expand to reading mode

- **WHEN** a user taps `Expand` in the peek
- **THEN** reading mode opens full screen, and closing it returns to the previous screen

#### Scenario: Text size is remembered

- **WHEN** a user picks `Large` in reading mode and later opens the playback Lyrics section
- **THEN** the lyrics render at the `Large` size

#### Scenario: Reading mode is legible in the dark

- **WHEN** reading mode is open
- **THEN** the lyrics text meets body-text contrast on the Nocturne ground at every text size

#### Scenario: Lyrics are selectable

- **WHEN** a user presses and holds on lyrics text
- **THEN** the platform's text selection and copy controls are available

### Requirement: Sheet music opens full screen only, with no playback-screen preview

Sheet music SHALL open only in a full-screen viewer reached from the `Sheet music` manager sheet. The playback screen SHALL NOT include a sheet music section, preview, or empty-state prompt, and the mini-player SHALL NOT include a sheet music control. The viewer SHALL use the Nocturne tokens, keep a play/pause control reachable, keep the screen awake while open, and offer a close control that returns to the previous screen without interrupting playback.

#### Scenario: The playback screen is unchanged

- **WHEN** a track with sheet music is playing
- **THEN** the playback screen shows no sheet music UI beyond the item menu's `Sheet music` action

#### Scenario: Full screen only

- **WHEN** a user opens a source from the manager sheet
- **THEN** a full-screen viewer opens, and there is no half-height peek

#### Scenario: Closing keeps playback going

- **WHEN** a user closes the viewer while a track plays
- **THEN** playback continues and the previous screen is shown

### Requirement: Practice tools are reachable from the tab bar, playback, and the sheet music viewer

The tab bar SHALL include a `Practice tools` item after the destinations, in the place of the former `Piano` item, so the tools can be reached on every screen with or without a track. Pressing it SHALL open a floating menu anchored to the control, listing one toggle row per available tool: `Piano` and `Pitch detection`; while the sheet music viewer is open it SHALL also list `Show other-octave matches`, a setting for the score marks that appears nowhere else. Each row SHALL show its tool's on or off state, pressing a row SHALL toggle that tool without closing the menu, and the menu SHALL close on a press outside it or on Escape. The item is a toggle host, not a destination: it SHALL show the accent colour, mark, and a filled glyph while any tool is on. The mini-player SHALL NOT carry its own tool controls. The dedicated playback screen SHALL include a `Practice tools` control in its header, beside the more actions button, and the sheet music viewer toolbar (and its rail in the compact layout) SHALL include the same control; each opens the same menu. Every control and row SHALL be at least 44 pt, use icons from the shared icon map, and carry accessible labels (`Practice tools`, and a row label with its state such as `Piano, on`). A row SHALL be absent where its tool is unavailable on the platform, and the whole control SHALL be absent where no tool is available. Opening a tool SHALL NOT move the waveform, transport, or mini-player; the overlay docks above them and the content area above shrinks. The menu SHALL be built so further tools can be added as rows.

#### Scenario: Open a tool with no track

- **WHEN** nothing has been played, or playback has ended and the mini-player is gone, and the user opens `Practice tools` and turns on `Piano`
- **THEN** the keyboard docks above the tab bar and plays, and stays open and playable when a track later starts or ends

#### Scenario: Open from the tab bar

- **WHEN** the user presses `Practice tools` in the tab bar on any screen and turns on `Piano`
- **THEN** a floating menu appears anchored to the control, the piano overlay docks above the tab bar (and above the mini-player when it shows), and the screen content above it shrinks to fit

#### Scenario: Two tools at once

- **WHEN** the user turns on `Piano`, then `Pitch detection`, without closing the menu
- **THEN** both rows show on, both tools are open, and the control shows its active state

#### Scenario: Dismiss the menu

- **WHEN** the menu is open and the user presses outside it, or presses Escape
- **THEN** the menu closes and the tools keep their state

#### Scenario: Open from the playback screen

- **WHEN** the user presses `Practice tools` on the playback screen and turns on `Piano`
- **THEN** the piano opens, the waveform and transport keep their positions in view, and the control shows its active state

#### Scenario: Open from the viewer

- **WHEN** the user presses `Practice tools` in the sheet music viewer and turns on `Piano`
- **THEN** the keyboard docks under the score and the score area shrinks to the space above it

#### Scenario: Other-octave matches is not a practice tool

- **WHEN** the user opens `Practice tools` from any surface, including the sheet music viewer
- **THEN** the menu lists only `Piano` and `Pitch detection`; `Show other-octave matches` is a toggle in the viewer's toolbar, shown only beside a MusicXML or MIDI score where pitch detection is available

#### Scenario: Only one tool available

- **WHEN** a browser has Web Audio but no microphone support
- **THEN** the menu lists `Piano` only

#### Scenario: No tool available

- **WHEN** the app runs on native iOS or Android before either tool is built there
- **THEN** no `Practice tools` control appears on the tab bar, the playback screen, or the viewer

### Requirement: Settings includes a Piano section

The Settings screen SHALL include a `Piano` section with `Sound` (`Piano`, `Organ`), `Show every note name` (`Off`, `On`), and `Black key names` (`Sharps`, `Flats`) rows in the same style as the existing preference rows.

#### Scenario: Change a piano preference

- **WHEN** the user picks `Flats` for `Black key names`
- **THEN** black keys labelled in flats read `B♭` instead of `A♯` the next time the keyboard shows labels

### Requirement: The playback screen supports markers

The dedicated playback screen overflow SHALL include `Markers` (opening the list for the playing item's owning track) and `Add marker here` (adding at the current position). The playback waveform SHALL draw marker flags per the active filter, SHALL add a marker on a long-press at the pressed position, and SHALL jump on a flag tap. The markers list SHALL be a bottom sheet with the filter (`All` / `My markers`), `Add marker here`, `Select` for choosing two markers, `Create loops from markers`, and rows showing the name and time; a row tap jumps and a row menu offers the actions for its kind. Adding, jumping, and flag display SHALL NOT move the waveform or transport controls.

#### Scenario: Open from the overflow

- **WHEN** the user opens the playback screen overflow and chooses `Markers`
- **THEN** a sheet lists the track's markers with the filter, and the playback stays undisturbed

#### Scenario: Flags and long-press

- **WHEN** the user long-presses the waveform
- **THEN** a flag appears at that point, a confirmation offers `Rename`, and the layout of the screen does not shift

#### Scenario: Empty state

- **WHEN** a track has no markers and no loops
- **THEN** the sheet says `No markers yet` and offers `Add marker here` when the track is loaded
