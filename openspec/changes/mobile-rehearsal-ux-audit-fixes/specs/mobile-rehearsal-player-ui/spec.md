## MODIFIED Requirements

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
