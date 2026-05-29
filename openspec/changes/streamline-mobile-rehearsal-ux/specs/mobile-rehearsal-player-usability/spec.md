## ADDED Requirements

### Requirement: Playlist detail prioritizes playback and lightweight management

The system SHALL present playlist detail as playback-first by default, with destructive and structural management actions available through concise, low-friction row interactions.

#### Scenario: Playlist detail foregrounds playback intent

- **WHEN** a user opens playlist detail
- **THEN** the system shows playback actions and current running order before secondary management controls such as rename or delete playlist

#### Scenario: Playlist item removal is fast and recoverable

- **WHEN** a user removes a playlist item from the default playlist detail mode
- **THEN** the system removes the item using a low-friction row interaction and shows undo feedback without leaving the playlist detail screen

#### Scenario: Playlist edit mode supports drag-and-drop plus explicit icon controls

- **WHEN** a user enters playlist edit mode
- **THEN** the system supports drag-and-drop reordering and explicit icon-based move controls while keeping destructive controls visually distinct from playback controls

### Requirement: Recents and Search optimize for immediate rehearsal actions

The system SHALL reduce steady-state interface weight on Recents and Search so users can resume playback, find tracks, and take primary actions with minimal scanning.

#### Scenario: Recents remains an optional acceleration surface

- **WHEN** Recents is present in navigation
- **THEN** the system treats Recents as optional for recents and shortcut actions and keeps core discovery and library actions available without requiring Recents as an entry step

#### Scenario: Recents promotes immediate resume or next action when used

- **WHEN** a user with recent or active rehearsal context opens Recents
- **THEN** the system prioritizes a direct resume or continue-practice action before secondary explanatory content

#### Scenario: Search prioritizes result actionability

- **WHEN** search results are shown
- **THEN** the system keeps primary row actions visible and quickly reachable without requiring navigation into additional management views

### Requirement: Search contexts are explicitly separated between source discovery and app library

The system SHALL provide explicit search context separation so users can search Google Drive content independently from app-owned rehearsal library content.

#### Scenario: Drive search context is visible and scope-aware

- **WHEN** a user performs search in Google Drive discovery
- **THEN** the system indicates Drive search as the active context and shows whether search is globally scoped or constrained to the current folder path

#### Scenario: Library search context targets app-owned rehearsal entities

- **WHEN** a user performs search in the app library context
- **THEN** the system searches saved tracks, loops, playlists, and organization metadata without mixing raw Google Drive discovery results

#### Scenario: Switching contexts preserves query intent without ambiguity

- **WHEN** a user switches between Drive search and library search contexts
- **THEN** the system updates visible context labels and result corpus immediately so the active query target is unambiguous

#### Scenario: Search entry points are available in both working surfaces

- **WHEN** a user is in the Google Drive navigation workflow or in the app-library workflow
- **THEN** the system provides a first-class search entry point in that active surface without requiring a context switch first

### Requirement: Queue and playback surfaces keep controls legible and mode-appropriate

The system SHALL keep queue and now-playing controls mode-aware, visually clear, and aligned with familiar mobile music semantics.

#### Scenario: Queue surface exposes actionable session controls

- **WHEN** a user opens Up Next during an active queue session
- **THEN** the system shows current and upcoming items with clearly reachable queue-mode controls and explicit state visibility

#### Scenario: Standalone playback hides queue-only controls

- **WHEN** a user plays a standalone item outside queue context
- **THEN** the system omits queue-only controls while preserving current-item rehearsal controls and repeat behavior

### Requirement: Core playback and list actions meet touch and accessibility expectations

The system SHALL keep transport, list-row, and menu interactions touch-friendly and accessible across supported mobile surfaces.

#### Scenario: Icon-only controls remain understandable

- **WHEN** an interaction relies on icon-only controls
- **THEN** the system provides accessible labels and clear selected or disabled state treatment beyond color alone

#### Scenario: Rehearsal-critical controls remain easy to target

- **WHEN** users interact with playback transport, list-row actions, and menu affordances on phone-sized screens
- **THEN** the system provides touch target sizing and press feedback that support fast one-handed use
