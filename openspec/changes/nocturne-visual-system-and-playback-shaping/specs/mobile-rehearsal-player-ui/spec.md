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
- **THEN** each selectable folder and audio row shows its selected or unselected state with a dedicated glyph plus the row's active title treatment rather than color alone, and the selection count, `Select All Matching`, `Cancel`, `Continue`, and `Edit Selection` controls remain present with their existing behavior
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

### Requirement: The dedicated playback screen prioritizes waveform scrubbing, transport, and rehearsal context

The system SHALL provide a full-screen playback modal that slides up from the bottom and foregrounds a SoundCloud-style waveform, rehearsal-oriented transport controls, and contextual track information for metadata-poor stems.

Companion mockup states: design screen 1f shows the collapsed state with the practice row, screen 1g shows the full-screen waveform state, screen 1i shows the shaping surface reached from it, and screen 1h shows the queue sheet.

#### Scenario: Mini-player expands into a slide-up playback modal

- **WHEN** a user opens the dedicated playback screen from the mini-player or another playback entry point
- **THEN** the system presents a full-screen modal that slides up from the bottom, includes a swipe-down chevron or pill plus contextual header text such as `Rehearsing: [Song Name]`, and keeps audio playback uninterrupted during the transition

#### Scenario: The playback surface has a collapsed practice state and a full-screen waveform state

- **WHEN** a user opens the dedicated playback screen
- **THEN** the system first presents a collapsed state carrying track identity, rehearsal context, a compact timeline, transport, and the practice controls, and offers an explicit affordance to expand into the full-screen waveform state
- **AND** expanding or collapsing does not interrupt audio or lose the current position

#### Scenario: Waveform is the dominant interactive hero

- **WHEN** the full-screen waveform state is visible
- **THEN** the system shows a large interactive waveform for the entire active item instead of square artwork, colors the played portion with an active state from left to right, renders the unplayed portion in a muted state, and lets the user scrub by dragging horizontally across the waveform itself

#### Scenario: The waveform is derived from the actual audio

- **WHEN** the system renders a waveform for an item
- **THEN** its shape comes from peak data derived from that item's own audio, so two different items do not render the same shape
- **AND** while peak data for an item is not yet available, the system renders a neutral placeholder band rather than a synthetic waveform shape, so the interface never implies analysis it does not have

#### Scenario: Playback controls keep rehearsal skip jumps available

- **WHEN** a user views the primary transport row on the dedicated playback screen
- **THEN** the system keeps skip-back and skip-forward controls for rehearsal jumps such as 10 or 15 seconds adjacent to play / pause so current-item rehearsal navigation remains available

#### Scenario: The practice row exposes speed and pitch and reaches the shaping surface

- **WHEN** the collapsed playback state is visible
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
