## ADDED Requirements

### Requirement: Track rows support ad-hoc queue acceleration actions

The system SHALL provide quick queue actions from track-focused contexts so users can shape the current rehearsal session without opening playlist editors.

#### Scenario: Add a saved item to play next from row-level actions

- **WHEN** a user opens row actions for a playable saved track or loop during an active session
- **THEN** the system offers a `Play next` style action that inserts that item immediately after the current item in the active session queue

#### Scenario: Add a saved item to queue from row-level actions

- **WHEN** a user opens row actions for a playable saved track or loop during an active session
- **THEN** the system offers an `Add to queue` style action that appends that item to the active upcoming queue without interrupting current playback

#### Scenario: Queue quick actions preserve active playback continuity

- **WHEN** a user runs an ad-hoc queue quick action
- **THEN** the system applies the queue update without interrupting current playback

### Requirement: Recents provides fast recent rehearsal entry points

The system SHALL provide direct shortcuts to recent rehearsal context so users can restart common practice flows in one step.

#### Scenario: Resume last rehearsal source from Recents

- **WHEN** a user has recent playback history
- **THEN** Recents shows a direct shortcut to resume the most relevant recent rehearsal item or playlist context

#### Scenario: Empty recent context falls back to discovery guidance

- **WHEN** no recent rehearsal context exists
- **THEN** Recents shows a concise guidance path to discovery and saving the first practice item

#### Scenario: New user with empty library can reach first playback quickly

- **WHEN** a user has no saved tracks, loops, or playlists
- **THEN** the system provides a clear path from empty-state guidance to Drive discovery, first save, and playback start without requiring pre-existing library content

#### Scenario: Recents can surface shortcut metadata such as popular tags

- **WHEN** Recents is enabled as an acceleration surface
- **THEN** the system may show shortcut metadata such as popular tags without making Recents a required step for core discovery or playback

### Requirement: Loop creation uses smart naming defaults

The system SHALL prefill loop naming with a meaningful default that users can keep or edit before saving.

#### Scenario: New loop gets an auto-generated default name

- **WHEN** a user opens loop creation for a source track
- **THEN** the system pre-populates loop name input with a context-aware default derived from source identity and selected time range

#### Scenario: User overrides the default loop name

- **WHEN** a user edits the suggested loop name before save
- **THEN** the system saves the user-entered name without forcing the default format

### Requirement: Search supports quick re-entry through recent queries

The system SHALL expose recent search terms to reduce repeated typing in frequent rehearsal sessions.

#### Scenario: Search shows recent queries before typing

- **WHEN** a user opens Search without an active query
- **THEN** the system presents recent search terms as tap-to-run suggestions

#### Scenario: Selecting a recent query executes search immediately

- **WHEN** a user taps a recent search term
- **THEN** the system applies the term, runs search, and shows updated results in the same search context

#### Scenario: Recent-query suggestions are contextual to the active search surface

- **WHEN** a user opens Drive search or app-library search without an active query
- **THEN** the system shows recent-query suggestions relevant to that active search context

### Requirement: Loops are managed in parent-track context with optional first-class organization

The system SHALL keep loop management anchored to parent tracks while allowing users to optionally organize loops as first-class library objects.

#### Scenario: Loop actions remain available from parent track context

- **WHEN** a user opens a saved track context that owns one or more loops
- **THEN** the system provides loop creation and management actions in that track context with visible parent-track provenance

#### Scenario: Loops can be promoted to first-class organized items

- **WHEN** a user chooses to organize loops independently
- **THEN** the system allows loops to appear in first-class library organization surfaces without removing their parent-track linkage
