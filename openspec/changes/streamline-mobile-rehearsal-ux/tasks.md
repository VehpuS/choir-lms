## 1. IA Foundation and Non-Regression Guardrails

- [x] 1.1 Document the current top-level IA (Home/Search/Library baseline with Home -> Recents and Search -> Add rename intent) and map every existing user-visible feature to a destination or entry point before reordering work begins.
- [x] 1.2 Define the next IA arrangement for top-level tabs and within-tab section order, including explicit placement for Google Drive browse/navigation, Drive search, and app-library search.
- [x] 1.3 Add non-regression acceptance criteria for critical existing capabilities (Drive root switching, folder navigation, breadcrumbs, source save/remove, track playback, loop creation, playlist playback).
- [x] 1.4 Add UI-level context labels and helper copy rules that prevent Drive features from being hidden or mislabeled after IA changes.
- [x] 1.5 Validate proposed IA against representative flows (discover in Drive -> save -> add to playlist -> play) and refine before component implementation.
- [x] 1.6 Build compact Recents mockups that include multiple shortcut modules (for example recents and popular tags) and capture design confirmation before implementation.

## 2. Playlist and Queue Interaction Streamlining

- [x] 2.1 Refine playlist detail hierarchy so playback actions stay primary and non-critical management actions move to lighter affordances.
- [x] 2.1.1 Standardize playlist overflow affordances by pinning vertical-ellipsis triggers to top-right in playlist list cards and playlist detail cards.
- [x] 2.1.2 Reuse a shared options-sheet surface for playlist management and track-context menus, replacing bespoke per-surface menu sheets.
- [x] 2.2 Implement low-friction playlist item removal interaction in default playlist detail mode while preserving undo snackbar recovery.
- [x] 2.3 Remove the dedicated playlist edit mode and expose default-visible playlist row reorder controls that follow Apple-style drag affordances, keep play/pause inline, and group up/down controls beside the overflow trigger.
- [x] 2.3.1 Route playlist-row `Move to position` and `Remove` into the shared overflow menu while reusing the same bounded slider modal and confirmation flow as the active queue control.
- [x] 2.4 Add `Play next` queue quick-action support for saved track and loop rows without interrupting active playback.
- [x] 2.5 Add `Add to queue` queue quick-action support for saved track and loop rows without interrupting active playback.
- [x] 2.6 Update queue and now-playing control presentation so mode-aware controls remain explicit and queue-only controls stay hidden in standalone playback.
- [x] 2.7 Standardize saved loop cards with saved track cards for add-to-playlist affordances, including consistent action placement, labels, and feedback.
- [x] 2.8 Add a top-level play icon on playlist cards while preserving `Open playlist` navigation and existing overflow management actions. Do not use a text-labeled `Play` button.
- [x] 2.8.1 Add `Remove playlist` to the shared playlist-card overflow menu so saved playlists can be deleted without opening playlist detail.
- [x] 2.8.2 Keep playlist-card rename in Library context by opening the rename flow in place instead of routing through playlist detail.

## 3. Top-Level Tab Reordering and Search Contexts

- [x] 3.1 Reorder top-level tab composition and within-tab sections according to the IA plan while preserving current feature coverage.
- [x] 3.1.1 Rename the middle destination from `Search` to `Add` across shell labels, file/component/constant identifiers, and repo guidance or skill docs so `Search` remains an operation rather than a destination name.
- [x] 3.2 Rebalance Recents hierarchy so Recents stays optional and non-blocking while still supporting recents and shortcut use cases.
- [x] 3.3 Add recent rehearsal entry points on Recents with concise fallback guidance for first-use or empty-history states, and optional shortcut metadata (for example popular tags).
- [x] 3.3.1 Use icon-first playback entry on Recents resume and shortcut cards, replacing any text-labeled `Play` button with a standard play icon while keeping descriptive copy outside the control.
- [x] 3.3.2 Rename remaining legacy `Home` file/component/constant identifiers to `Recents` equivalents while preserving behavior and destination order.
- [x] 3.3.3 Expand Recents from single-item resume to session-persisted compact multi-item history (tracks/loops/playlists) with explicit per-item play buttons and clear `Last played` labeling semantics.
- [x] 3.3.4 Add a vertical-ellipsis overflow menu on Recents recent-item rows with `Play next`, `Add to queue`, and `View in library` actions while keeping inline icon-only `Play` as the primary action.
- [x] 3.4 Implement explicit dual search contexts: Google Drive discovery search (including folder scoping) and dedicated app-library search.
- [x] 3.5 Add clear active-context and scope indicators so users always know which corpus (Google Drive in Add vs library in Library) is being searched.
- [x] 3.6 Scope Add Drive search to navigation context after folder drill-down: keep root-level search at selected-root scope, and default to current-folder-path scope after users enter folders.
- [x] 3.7 Add recent-search suggestion interactions for the active search context that allow tap-to-run query execution.
- [x] 3.8 Verify Google Drive navigation remains first-class after tab/section reorder inside Add: root selector, folder drill-down, breadcrumbs, search-control placement under breadcrumbs, and unavailable/source status visibility.
- [x] 3.9 Add Drive search-result preview playback so playable Google Drive sources can be auditioned without saving first, while keeping Save available as a separate action.
- [x] 3.10 Highlight matched query substrings in visible search-result text for both Add (Google Drive) and Library contexts, using the same normalized match semantics as result filtering.

## 4. Loop and Action Defaults

- [x] 4.1 Add context-aware default loop naming in loop creation while preserving user override behavior before save.
- [x] 4.2 Align row-level action menus to include new queue-acceleration actions and maintain consistent icon semantics across Library and Add, while keeping saved track and saved loop rows behaviorally identical except for track-only loop creation.
- [x] 4.2.1 Apply the shared overflow menu UI to saved source rows (`DriveLibrarySourceGroup`) and route secondary/destructive actions into that menu.
- [x] 4.2.2 Introduce explicit row-action placement metadata (`inline` vs `menu`) with backward-compatible fallback logic and migrate current source/playlist callers.
- [x] 4.2.3 Replace heuristic action grouping rules with explicit placement-only behavior after caller migration and validation.
- [x] 4.2.4 Expand the shared overflow menu pattern to remaining row-action surfaces (for example loop rows and future queue quick-action entry points) so saved track and saved loop rows converge on the same top-level menu structure and icon semantics.
- [x] 4.2.5 Extract a shared overflow-trigger primitive (top-right vertical-ellipsis affordance) and adopt it in playlist, source, and future row-action surfaces.
- [x] 4.2.6 Converge playable row surfaces in Library and Add on one inline icon-only `Play` action plus a shared overflow trigger, while keeping `Make loop` as a saved-track-only overflow action.
- [x] 4.2.6.1 After row-action placement and quick-action semantics stabilize, extract a shared compact playable-row shell and adopt it in Add, Library, loop, and Recents row-style surfaces without collapsing surface-specific metadata, badges, or availability messaging.
- [x] 4.2.7 Extend queue-action availability rules to every queue-capable item surface so users can create or grow a transient queue from standalone playback without first opening a playlist. Implement transient queue promotion when `Play next` or `Add to queue` is invoked during standalone single-track playback, keeping the current track as queue head and preserving uninterrupted playback.
- [x] 4.2.8 Surface queue-management affordances across queue-capable item surfaces once a transient or playlist-backed queue exists, while keeping queue-only controls hidden during true single-item playback with no queued follow-up.
- [x] 4.2.9 Add a `Create new playlist` action in the Up Next queue summary area to save the current queue order as a new playlist while preserving uninterrupted playback, then immediately treat the active queue as that new playlist for follow-up updates.
- [x] 4.2.10 Add an `Update current playlist` action in the Up Next queue summary area for playlist-backed queue sessions, confirm before replacing that playlist's saved items and order with the current queue order, and keep the active queue session unchanged.
- [x] 4.2.11 Constrain the active rehearsal queue list to a scrollable maximum height so the queue summary, queue-mode controls, and transport remain visible for long queues.
- [x] 4.2.12 Add active queue row controls for direct playback and reordering: per-row play buttons, drag handles, and overflow actions for remove, move to start, move to end, and move to a specific queue position.
- [x] 4.2.13 Add a move-to-position modal for queue rows with a slider bounded from queue position `1` through the last queue position, and apply the selected position without restarting playback.
- [x] 4.2.14 Remove redundant `Up next` / `Now playing` row text from the active queue once direct play controls exist, and keep current-item state legible through row styling and control state.
- [x] 4.2.15 Add previous and next track transport controls directly to the active rehearsal queue view.
- [x] 4.3 Ensure loop management remains parent-track-first while supporting optional promotion of loops to first-class organization surfaces.
- [x] 4.4 Add track-context loop management entry points (create, view, edit, remove) and preserve visible parent-track linkage in all loop surfaces, with `Make loop` living in saved track overflow only.
- [x] 4.4.1 Keep the default top-level Saved loops Library section and add a `View track loops` saved-track overflow action that opens a full-screen Library detail view for that track's loops when loops exist, while preserving loop action parity for playback, add to playlist, queue, and remove flows.
- [x] 4.4.2 Keep the track-scoped loop surface visibly tied to its parent track, make it replace the main Library browse UI with a back path while active, add ordered loop-series playback plus a `Make new loop` action for that track, and reuse the same shared loop row actions and metadata needed for fast playback and playlist workflows.
- [x] 4.5 Audit shell, playback, and queue surfaces for remaining text-labeled `Play` buttons, replace them with standard playback icons where appropriate, and update icon-only control labels, selected/disabled states, and touch-target sizing.
- [x] 4.5.1 Extract a shared icon-only playback-action primitive for repeated compact playback entry points (for example Add source rows, Recents rows and shortcut chips, and playlist cards) while keeping larger transport controls on their existing surface-specific components.
- [x] 4.5.2 Redesign playlist-detail fresh-start playback controls into icon-first ordered/shuffle actions, keep the active queue mode legible, and preserve a playlist-specific larger control surface instead of collapsing those actions into the compact row/card playback primitive.
- [ ] 4.6 Extract shared interaction style tokens for card shells, action buttons, chips, and pressed/disabled states used by playlist/source/menu surfaces.
- [ ] 4.6.1 Extract a shared contextual search panel scaffold for Add and Library search surfaces, reusing the input row, submit affordance, recent-search suggestions, and helper or clear-action slots while preserving each search context's copy and disabled rules.
- [ ] 4.6.2 Extract a shared section-heading primitive with eyebrow, title, body copy, and optional trailing action, and adopt it in Drive, Library, playlist, and modal entry surfaces where that structure already repeats.
- [ ] 4.6.3 Extract a shared feedback-card family for status, issue, and empty states, and adopt it in Drive status, playlist creation and rename issues, and empty playlist-selector flows without changing workflow semantics.
- [ ] 4.6.4 Extract a shared chip family for recent searches, Drive root selection, Recents shortcut tags, and future tag or filter surfaces with passive, selected, and action variants.
- [ ] 4.7 Extract a shared centered dialog-card shell for rename/create/select flows and migrate existing playlist dialogs without changing workflow behavior.
- [ ] 4.7.1 Move create-playlist entry into the Library Playlists section header with a right-aligned `+` trigger that opens the shared create modal with playlist name input, replacing any persistent bottom-of-Library creation component.
- [ ] 4.7.2 Extract a shared modal-surface base beneath bottom-sheet and centered-dialog variants, then migrate playlist, selector, and loop-builder flows onto it without forcing one modal presentation across all cases.

## 5. Library Organization (Tags, Filters, Optional Folders)

- [ ] 5.1 Add dedicated app-library search behavior over saved entities (tracks, loops, playlists, folders, tags) independent of Drive discovery search.
- [ ] 5.2 Add tag assignment and tag-filter interactions for app-owned library entities without changing playback semantics.
- [ ] 5.2.1 Ensure loops remain independently taggable even when default Library browsing reaches them through `View track loops` parent-track navigation.
- [ ] 5.3 Add lightweight folder organization flows for library entities, including loops, as part of the first organization baseline.
- [ ] 5.3.1 Ensure folders can contain loops directly and folder views surface those loops without requiring navigation through the parent track first.
- [ ] 5.4 Preserve and display parent-track provenance when loops are shown in standalone search, tag, or folder result groups.
- [ ] 5.4.1 Keep default Library browse track-context-first while search, tag, and folder results still surface loops in their own top-level result category with parent linkage intact.

## 6. Validation and Regression Safety

- [ ] 6.1 Add or update focused automated coverage for new view-model or helper behavior introduced by queue quick actions, dual search contexts, library organization, loop default naming, and tab/section reordering.
- [ ] 6.1.1 Add focused automated coverage for row-action placement behavior (explicit placement precedence, fallback behavior, and menu mapping).
- [ ] 6.1.2 Add UI-focused coverage for shared overflow trigger behavior (visibility, accessibility label semantics, disabled/pressed states, and menu open/close).
- [ ] 6.1.3 Add focused automated coverage for search highlight rendering so highlighted spans match active query logic in both Add and Library contexts.
- [ ] 6.1.4 Add UI-focused coverage for extracted shared UI primitives (contextual search, section heading, feedback card, chip variants, playable-row shell, and modal-surface base) so context-specific copy, state handling, and layout variants remain stable across adopting surfaces.
- [ ] 6.1.5 Add focused automated coverage for active queue view behavior, including queue-row play and reorder actions, move-to-position bounds, and row-state presentation without `Up next` / `Now playing` eyebrow text.
- [ ] 6.1.5.1 Add focused automated coverage for default-visible playlist row controls and overflow behavior, including one-based `Move to position` bounds, play/pause and grouped up/down placement, and parity with the queue move-to-position mapping.
- [ ] 6.1.6 Add focused automated coverage for `View track loops` availability, top-level Saved loops section preservation, track-scoped ordered loop playback behavior, `Make new loop` availability, and loop result-category behavior across search, tag, and folder contexts.
- [ ] 6.2 Run manual regression for rehearsal-critical flows: playlist row-start playback, playlist-card play icon behavior, Recents shortcut play icon behavior, Recents history persistence after app relaunch, Recents recent-item overflow actions (`Play next`, `Add to queue`, `View in library`) and playback continuity, standalone single-track playback promoted into a transient queue via `Play next` and `Add to queue`, playable row parity across Library and Add, track-only `Make loop` visibility, undoable removal, default playlist row reorder and overflow behavior, queue-mode transitions, loop save/preview, mini-player persistence, Drive search-result preview playback without save, Drive search scoping, app-library search/filter behavior, and Drive navigation continuity.
- [ ] 6.2.1 Manually verify transient queue creation from standalone playback across queue-capable surfaces: start a single track, invoke `Play next` and `Add to queue` from Library/Add/Recents where available, confirm Up Next becomes visible, and confirm the current item remains first in the resulting queue.
- [ ] 6.2.2 Manually verify queue-to-playlist capture from Up Next: use `Create new playlist` from transient and playlist-backed queues, confirm `Update current playlist` appears immediately afterward and targets the newly created playlist, use `Update current playlist` from a playlist-backed queue, confirm the update confirmation appears before replacing saved order, confirm resulting playlist item order, and confirm current playback item and position remain uninterrupted.
- [ ] 6.2.3 Manually verify active rehearsal queue view behavior: long queues stay scrollable within the visible sheet, queue-row play buttons jump playback correctly, drag and overflow reordering updates order without restarting playback, move-to-position slider respects queue bounds, row status text no longer repeats `Up next` / `Now playing`, and next/previous controls work from the queue view.
- [ ] 6.2.3.1 Manually verify default playlist row controls: open playlist detail, confirm drag handles are visible by default, confirm play/pause follows the drag handle, confirm up/down controls sit together before the overflow trigger, confirm `Move to position` and `Remove from playlist` live in overflow, confirm the `Move to position` slider is bounded from playlist position `1` through the last playlist position, then move an item to first, middle, and last positions without leaving playlist detail or interrupting active playback.
- [ ] 6.2.3.2 Manually verify playlist-detail playback mode controls: open playlist detail, confirm ordered and shuffle actions are icon-first with visible mode labels, confirm the active queue mode remains visually distinguishable when that playlist is already running, and confirm selecting ordered versus shuffle starts playback in the chosen mode without leaving playlist detail.
- [ ] 6.2.4 Manually verify search-result match highlighting in both Add and Library: run representative queries, confirm only matched substrings are emphasized, and confirm highlights update correctly after query edits, filter changes, and context switches.
- [ ] 6.2.5 Manually verify Drive search scoping in Add: at root, confirm search spans selected root; after folder drill-down, confirm search defaults to current-folder scope and breadcrumb changes update that scope before rerunning search.
- [ ] 6.2.6 Manually verify shared-primitives rollout preserves per-surface behavior: Add versus Library search copy and clear actions, recent-search and root-selector chip states, status or issue or empty feedback cards, compact row metadata and badge placement, overflow action ordering (primary first, destructive last), and centered-dialog versus bottom-sheet presentation differences.
- [ ] 6.2.7 Manually verify loop navigation and organization intent: the top-level Saved loops section remains available; tracks with loops expose `View track loops`; the track-scoped loop view keeps parent-track context visible, supports ordered loop-series playback plus row-start playback, surfaces a `Make new loop` action for that track, keeps add-to-playlist, queue, and remove actions easy to reach; loops remain independently taggable and folder-addressable; search/tag/folder contexts show loops in their own visible result category with parent linkage; and `Make loop` remains a saved-track-only entry point.
- [ ] 6.3 Explicitly verify no existing critical feature was lost during IA reorder using the baseline mapping from 1.1 and record pass/fail per feature.
- [ ] 6.4 Compare final Recents, Add, Library, playlist detail, now-playing, and queue surfaces against this change's specs and capture any intentional deltas before completing implementation.
