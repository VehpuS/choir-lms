## ADDED Requirements

### Requirement: Playlist detail prioritizes playback and lightweight management

The system SHALL present playlist detail as playback-first by default, with destructive and structural management actions available through concise, low-friction row interactions.

#### Scenario: Playlist detail foregrounds playback intent

- **WHEN** a user opens playlist detail
- **THEN** the system shows playback actions and current running order before secondary management controls such as rename or delete playlist

#### Scenario: Playlist cards expose immediate playback entry

- **WHEN** a user views saved playlist cards in Library
- **THEN** each card provides a top-level icon-only play action that starts playback for that playlist without first opening playlist detail
- **AND** the card preserves `Open playlist` as a separate detail-navigation action

#### Scenario: Playlist card rename stays in Library context

- **WHEN** a user chooses `Rename playlist` from a saved playlist card overflow menu in Library
- **THEN** the system opens the rename flow without navigating into playlist detail
- **AND** after submit or cancel, the user remains in the Library surface with their current list context preserved

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

#### Scenario: Direct playback entry avoids text-labeled Play buttons

- **WHEN** a surface offers a direct playback-start control in a playlist card, playable row, Recents shortcut, or shell playback affordance
- **THEN** the system uses a standard play icon for the actionable control instead of a text-labeled `Play` button where the meaning is already clear from context
- **AND** any supporting description remains outside the control itself

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

#### Scenario: Standard playback iconography stays consistent across contexts

- **WHEN** the app exposes direct playback entry in playlist cards, playable rows, Recents shortcuts, mini-player controls, or now-playing transport
- **THEN** the system uses consistent play-icon semantics across those contexts rather than mixing icon buttons and text-labeled `Play` buttons for the same action type

#### Scenario: Rehearsal-critical controls remain easy to target

- **WHEN** users interact with playback transport, list-row actions, and menu affordances on phone-sized screens
- **THEN** the system provides touch target sizing and press feedback that support fast one-handed use

### Requirement: Row-level secondary actions use a shared overflow menu pattern

The system SHALL use a consistent overflow-menu interaction for secondary and destructive row actions across playlist and source-list surfaces.

#### Scenario: Saved track and saved loop rows share one primary action model

- **WHEN** a user views saved track rows and saved loop rows in Library surfaces
- **THEN** each row exposes exactly one inline primary action, an icon-only `Play` control
- **AND** each row exposes one vertical-ellipsis overflow trigger in the same visual position
- **AND** no additional secondary text buttons are shown inline on either row type

#### Scenario: Playlist cards and detail views use a fixed top-right overflow trigger

- **WHEN** a user views playlist list cards or playlist detail
- **THEN** each surface exposes a fixed top-right vertical-ellipsis trigger that opens the shared options menu for non-primary management actions
- **AND** playlist list cards keep `Open playlist` separate from the overflow menu while offering playlist management actions such as rename and remove from that menu
- **AND** choosing `Rename playlist` from a playlist list card does not implicitly navigate to playlist detail before showing the rename flow

#### Scenario: Saved source rows keep primary actions inline and move secondary/destructive actions into overflow

- **WHEN** a user views saved source rows in Library or Search contexts
- **THEN** the system keeps only the playback-first icon action inline and places lower-frequency or destructive actions (for example add to playlist, play next, add to queue, and remove) in the shared overflow menu
- **AND** overflow actions are presented directly in the first options menu surface without a nested "More options" step

#### Scenario: Saved loop rows align with saved track rows for shared applicable actions

- **WHEN** a user views saved loop rows and saved track rows in Library surfaces
- **THEN** both row types provide equivalent applicable actions with consistent labels, placement, and state feedback, including add to playlist and queue actions
- **AND** both row types open an explicit playlist selection menu before adding the item to the chosen playlist
- **AND** the only intentional action difference is that saved tracks include `Make loop` in overflow and saved loops do not

#### Scenario: New row-action capabilities adopt the same overflow grouping rules

- **WHEN** new row-level actions are added in this change (for example queue acceleration actions)
- **THEN** those actions follow the same shared overflow menu pattern unless they are designated as the row's primary quick action

### Requirement: Row-action placement remains explicit and stable across UI updates

The system SHALL determine row-action placement from explicit action metadata so action location stays stable when copy, tone, or localization changes.

#### Scenario: Explicit placement metadata controls action location

- **WHEN** a row action is configured with explicit placement metadata (`inline` or `menu`)
- **THEN** the system places that action in the requested location regardless of display label changes

#### Scenario: Fallback behavior remains backward-compatible during migration

- **WHEN** legacy row actions do not yet provide explicit placement metadata
- **THEN** the system applies backward-compatible placement behavior until migration is complete

#### Scenario: Post-migration behavior no longer depends on heuristic labels

- **WHEN** all migrated row-action callers provide explicit placement metadata
- **THEN** row-action placement no longer depends on label-based heuristics

### Requirement: Shared row-action primitives preserve consistency without reducing usability

The system SHALL use shared overflow-trigger and dialog-shell primitives so related surfaces remain visually and behaviorally consistent without reducing access to primary rehearsal actions.

#### Scenario: Overflow trigger affordance is consistent across row-action surfaces

- **WHEN** playlist, source, or loop rows expose overflow actions
- **THEN** each surface uses a shared top-right vertical-ellipsis trigger with consistent hit target sizing, accessibility labeling, and pressed/disabled feedback

#### Scenario: Shared dialog shell keeps existing workflow semantics intact

- **WHEN** rename/create/select flows adopt a shared dialog-card shell
- **THEN** existing workflow steps, confirmation actions, and cancellation behavior remain functionally unchanged

#### Scenario: Overflow and selector surfaces share one sheet style

- **WHEN** users open overflow menus and follow-up selection flows (for example add-to-playlist selectors)
- **THEN** those flows use one shared sheet-surface visual style and interaction pattern across the app
