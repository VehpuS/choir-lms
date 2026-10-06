## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: The dedicated playback screen prioritizes waveform scrubbing, transport, and rehearsal context

The system SHALL provide a full-screen playback modal that slides up from the bottom and foregrounds a SoundCloud-style waveform, rehearsal-oriented transport controls, and contextual track information for metadata-poor stems.

Companion mockup states: design screen 1f shows the playback sheet with the practice row, screen 1g shows the full-screen loop editor that playback can enter to edit a loop, screen 1i shows the shaping surface reached from the sheet, and screen 1h shows the queue sheet.

#### Scenario: Mini-player expands into a slide-up playback modal

- **WHEN** a user opens the dedicated playback screen from the mini-player or another playback entry point
- **THEN** the system presents a full-screen modal that slides up from the bottom, includes a swipe-down chevron or pill plus contextual header text such as `Rehearsing: [Song Name]`, and keeps audio playback uninterrupted during the transition

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
