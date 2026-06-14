## ADDED Requirements

### Requirement: Playlist detail prioritizes playback and lightweight management

The system SHALL present playlist detail as playback-first by default, with destructive and structural management actions available through concise, low-friction row interactions.

#### Scenario: Playlist detail foregrounds playback intent

- **WHEN** a user opens playlist detail
- **THEN** the system shows playback actions and current running order before secondary management controls such as rename or delete playlist

#### Scenario: Playlist detail fresh-start playback uses icon-first ordered and shuffle actions

- **WHEN** a user views playlist detail playback controls
- **THEN** the system exposes ordered and shuffle start actions as icon-first controls with visible mode labels
- **AND** the UI does not render text-labeled `Play ordered` or `Shuffle play` buttons in playlist detail
- **AND** selecting either control starts playback for that playlist in the chosen queue mode without leaving playlist detail
- **AND** if ordered or shuffle playback for that playlist is already active, the current queue mode remains visually distinguishable in the control row

#### Scenario: Playlist cards expose immediate playback entry

- **WHEN** a user views saved playlist cards in Library
- **THEN** each card provides a top-level icon-only play action that starts playback for that playlist without first opening playlist detail
- **AND** the card preserves `Open playlist` as a separate detail-navigation action

#### Scenario: Playlist creation opens from the Playlists section header

- **WHEN** a user views the Playlists section in Library
- **THEN** the section header exposes a right-aligned `+` action for creating a new playlist
- **AND** selecting that action opens a modal with playlist name input and create/cancel controls
- **AND** playlist creation does not rely on a persistent component anchored to the bottom of the Library screen

#### Scenario: Playlist card rename stays in Library context

- **WHEN** a user chooses `Rename playlist` from a saved playlist card overflow menu in Library
- **THEN** the system opens the rename flow without navigating into playlist detail
- **AND** after submit or cancel, the user remains in the Library surface with their current list context preserved

#### Scenario: Playlist item removal is fast and recoverable

- **WHEN** a user removes a playlist item from the default playlist detail mode
- **THEN** the system removes the item using a low-friction row interaction and shows undo feedback without leaving the playlist detail screen

#### Scenario: Playlist detail rows expose always-available reorder controls

- **WHEN** a user views playlist detail rows
- **THEN** each row exposes a default-visible drag handle that follows iOS reorder conventions
- **AND** each row places a standard play or pause control immediately after the drag affordance
- **AND** each row places paired up and down controls on the trailing side immediately before the overflow trigger
- **AND** the system does not require a separate edit mode to access reorder controls

#### Scenario: Playlist detail row overflow keeps lower-frequency actions secondary

- **WHEN** a user opens the overflow menu for a playlist detail row
- **THEN** the menu includes `Move to position` and `Remove from playlist`
- **AND** `Move to position` appears before `Remove from playlist`
- **AND** destructive remove appears last instead of as a separate top-level row control

#### Scenario: Playlist detail row move to position uses the same bounded control as queue rows

- **WHEN** a user chooses `Move to position` for a playlist detail row
- **THEN** the system opens the same modal and one-based slider treatment used by queue-row move-to-position
- **AND** the slider is bounded from playlist position `1` through the last available playlist position
- **AND** confirming the modal moves the selected item to that playlist position without leaving playlist detail or restarting active playback

### Requirement: Recents and Add optimize for immediate rehearsal actions

The system SHALL reduce steady-state interface weight on Recents and Add so users can resume playback, browse Google Drive, and take primary actions with minimal scanning.

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

#### Scenario: Playlist detail mode actions stay icon-first while preserving mode clarity

- **WHEN** playlist detail offers ordered and shuffle fresh-start playback actions
- **THEN** those actions present their queue mode through supporting labels adjacent to the icon-first control rather than by prefixing the visible button copy with `Play`

#### Scenario: Search prioritizes result actionability

- **WHEN** search results are shown
- **THEN** the system keeps primary row actions visible and quickly reachable without requiring navigation into additional management views

#### Scenario: Search results highlight matched query text

- **WHEN** a user runs search in Add or Library with a non-empty active query
- **THEN** the system visually highlights the exact matched text spans in each visible matching result row
- **AND** highlighted spans update immediately when the query or active search context changes

#### Scenario: Highlighting remains consistent with search matching behavior

- **WHEN** a result row is included by search matching logic
- **THEN** the highlighted spans reflect the same normalized match semantics used to include that row
- **AND** the UI does not show highlight spans for text that did not contribute to the match

#### Scenario: Drive search results support preview playback without save

- **WHEN** a user views playable Google Drive search results
- **THEN** each playable row exposes a direct playback-preview action that starts audio without requiring the source to be saved first
- **AND** Save remains available as a separate action for promoting the source into Library-managed workflows

### Requirement: Search contexts are explicitly separated between source discovery and app library

The system SHALL provide explicit search context separation so users can search Google Drive content independently from app-owned rehearsal library content.

#### Scenario: Google Drive discovery destination is labeled Add

- **WHEN** a user views the top-level navigation
- **THEN** the destination that contains Google Drive browse, search, and add-to-library workflow is labeled `Add`
- **AND** `Search` is not used as the destination label for that surface

#### Scenario: Drive search context is visible and scope-aware

- **WHEN** a user performs search in Google Drive discovery
- **THEN** the system indicates Drive search as the active context
- **AND** at root level, search scope is shown as the selected Drive root
- **AND** after navigating into a folder, search defaults to the currently browsed folder path and shows that folder-path scope explicitly

#### Scenario: Drive search control stays coupled to folder navigation context

- **WHEN** a user is browsing Google Drive folders in Add
- **THEN** the search control appears directly below breadcrumbs so search scope follows the visible navigation context
- **AND** moving between breadcrumbs segments updates the folder-scoped search context before the next query runs

#### Scenario: Library search context targets app-owned rehearsal entities

- **WHEN** a user performs search in the app library context
- **THEN** the system searches saved tracks, loops, playlists, and organization metadata without mixing raw Google Drive discovery results

#### Scenario: Switching contexts preserves query intent without ambiguity

- **WHEN** a user switches between Drive search and library search contexts
- **THEN** the system updates visible context labels and result corpus immediately so the active query target is unambiguous

#### Scenario: Search entry points are available in both working surfaces

- **WHEN** a user is in Add or in the app-library workflow
- **THEN** the system provides a first-class search entry point in that active surface without requiring a context switch first

#### Scenario: Preview playback stays in Drive context until user chooses save

- **WHEN** a user starts preview playback from a Google Drive search result row
- **THEN** the system keeps the item in Google Drive discovery context unless the user explicitly saves it
- **AND** preview playback state is visible through existing mini-player and now-playing affordances

### Requirement: Queue and playback surfaces keep controls legible and mode-appropriate

The system SHALL keep queue and now-playing controls mode-aware, visually clear, and aligned with familiar mobile music semantics.

#### Scenario: Queue surface exposes actionable session controls

- **WHEN** a user opens Up Next during an active queue session
- **THEN** the system shows current and upcoming items with clearly reachable queue-mode controls and explicit state visibility

#### Scenario: Queue view stays visible when many items are queued

- **WHEN** a user opens the active rehearsal queue with enough items to exceed the available sheet height
- **THEN** the queue list scrolls within a capped maximum height
- **AND** the queue summary, queue-mode controls, and queue transport remain visible without scrolling off-screen

#### Scenario: Queue rows expose direct play and reorder controls

- **WHEN** a user views rows in the active rehearsal queue
- **THEN** each row exposes a direct play button and a drag handle for reorder
- **AND** selecting the play button jumps playback to that queue item without requiring a separate row-label affordance

#### Scenario: Queue row overflow supports queue management actions

- **WHEN** a user opens the overflow actions for a queue row
- **THEN** the system offers `Remove from queue`, `Move to start`, `Move to end`, and `Move to position`

#### Scenario: Move to position uses a bounded queue-position control

- **WHEN** a user chooses `Move to position` for a queue row
- **THEN** the system opens a modal with a slider bounded from queue position `1` through the last available queue position
- **AND** confirming the modal moves the selected row to that position in the active queue order

#### Scenario: Queue rows omit redundant status copy when direct playback exists

- **WHEN** queue rows expose direct play controls
- **THEN** the system does not repeat `Now playing` or `Up next` eyebrow text on those rows
- **AND** current-item state remains understandable through row styling and play-control state

#### Scenario: Queue view includes previous and next transport

- **WHEN** a user is already in the active rehearsal queue view
- **THEN** the system exposes previous-track and next-track transport controls in that same queue view
- **AND** users do not need to return to Now Playing just to move backward or forward within the active queue

#### Scenario: Up Next offers queue-to-playlist actions for active queues

- **WHEN** a user opens Up Next while an active queue session is present
- **THEN** the system exposes a single row with a `Create new playlist` action
- **AND** when that active queue session is backed by a saved playlist, the same row also exposes `Update current playlist`
- **AND** that action row appears adjacent to the current queue or playlist summary and above the queue list

#### Scenario: Creating a new playlist from Up Next preserves playback continuity

- **WHEN** a user creates a new playlist from the current queue in Up Next
- **THEN** the playlist is created from the queue's current item order
- **AND** the active queue session immediately becomes associated with that newly created playlist so `Update current playlist` is available for follow-up queue edits
- **AND** the current playback item and position continue without restart

#### Scenario: Updating a playlist from Up Next preserves playback continuity

- **WHEN** a user chooses `Update current playlist` from Up Next for an active queue session backed by a saved playlist
- **THEN** the system asks for confirmation before replacing that playlist's saved items and order with the current queue order
- **AND** the active queue session remains in place and playback continues without interruption

#### Scenario: Standalone playback can be promoted into a transient queue

- **WHEN** a user is playing a single item outside playlist context and performs `Play next` or `Add to queue` from a queue-capable item surface
- **THEN** the system promotes playback into a transient queue session without restarting the current item
- **AND** queue surfaces and controls become available for the resulting transient queue

#### Scenario: True standalone playback hides queue-only controls

- **WHEN** a user plays a standalone item outside queue context
- **AND** no follow-up items have been queued yet
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

#### Scenario: Playlist detail rows keep lower-frequency actions in overflow

- **WHEN** a user views rows inside playlist detail
- **THEN** drag handle, play or pause, and grouped up/down controls remain inline on the row
- **AND** `Move to position` and `Remove from playlist` appear in the shared overflow menu
- **AND** lower-frequency row actions are not duplicated as extra top-level buttons outside the overflow menu

#### Scenario: Saved source rows keep primary actions inline and move secondary/destructive actions into overflow

- **WHEN** a user views saved source rows in Library or Add surfaces
- **THEN** the system keeps only the playback-first icon action inline and places lower-frequency or destructive actions (for example add to playlist, play next, add to queue, and remove) in the shared overflow menu
- **AND** overflow actions are presented directly in the first options menu surface without a nested "More options" step
- **AND** queue actions remain available whenever the surface supports queue operations, including the case where invoking them would create a transient queue from the currently playing standalone item

#### Scenario: Saved loop rows align with saved track rows for shared applicable actions

- **WHEN** a user views saved loop rows and saved track rows in Library surfaces
- **THEN** both row types provide equivalent applicable actions with consistent labels, placement, and state feedback, including add to playlist and queue actions
- **AND** both row types open an explicit playlist selection menu before adding the item to the chosen playlist
- **AND** the only intentional action difference is that saved tracks include `Make loop` in overflow and saved loops do not

#### Scenario: New row-action capabilities adopt the same overflow grouping rules

- **WHEN** new row-level actions are added in this change (for example queue acceleration actions)
- **THEN** those actions follow the same shared overflow menu pattern unless they are designated as the row's primary quick action

#### Scenario: Overflow menus keep priority ordering predictable

- **WHEN** a row, card, or recent-item overflow menu mixes primary, secondary, navigation, or destructive actions
- **THEN** the first overflow level lists primary actions before secondary or navigation actions
- **AND** destructive actions appear last
- **AND** actions within the same priority group keep a stable relative order across Library, Add, and Recents surfaces

#### Scenario: Queue-capable surfaces share the same transient-queue behavior

- **WHEN** a user invokes `Play next` or `Add to queue` from Library, Add, Recents, or another surface that exposes queue operations
- **THEN** the system applies the same queue mutation rules regardless of surface origin
- **AND** if playback was previously single-item, the action creates a transient queue rather than failing or hiding the queue option

#### Scenario: Recents recent-item rows adopt the shared overflow model

- **WHEN** a user views recent rehearsal rows on Recents
- **THEN** each row keeps one inline icon-only `Play` primary action
- **AND** each row exposes one vertical-ellipsis overflow trigger for secondary actions
- **AND** the first overflow level includes `Play next`, `Add to queue`, and `View in library` actions

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

The system SHALL use shared overflow-trigger, playback-action, and dialog-shell primitives so related surfaces remain visually and behaviorally consistent without reducing access to primary rehearsal actions.

#### Scenario: Overflow trigger affordance is consistent across row-action surfaces

- **WHEN** playlist, source, or loop rows expose overflow actions
- **THEN** each surface uses a shared top-right vertical-ellipsis trigger with consistent hit target sizing, accessibility labeling, and pressed/disabled feedback

#### Scenario: Direct playback affordance is consistent across repeated row and card surfaces

- **WHEN** Add source rows, Recents playback shortcuts, playlist cards, or similar compact surfaces expose a direct icon-only playback entry
- **THEN** those surfaces use one shared playback-action primitive for that control
- **AND** the primitive keeps glyph semantics, accessibility labels, hit target sizing, and pressed or disabled state treatment aligned across those surfaces

#### Scenario: Shared dialog shell keeps existing workflow semantics intact

- **WHEN** rename/create/select flows adopt a shared dialog-card shell
- **THEN** existing workflow steps, confirmation actions, and cancellation behavior remain functionally unchanged

#### Scenario: Overflow and selector surfaces share one sheet style

- **WHEN** users open overflow menus and follow-up selection flows (for example add-to-playlist selectors)
- **THEN** those flows use one shared sheet-surface visual style and interaction pattern across the app
