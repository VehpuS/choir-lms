## 1. Completed Baseline

These items already reflect the current app state. Treat them as the regression-sensitive baseline for the remaining work rather than as future implementation steps.

### IA, Shell, and Search Context Baseline

- [x] 1.1 Document the current top-level IA (Home/Search/Library baseline with Home -> Recents and Search -> Add rename intent) and map every existing user-visible feature to a destination or entry point before reordering work begins.
- [x] 1.2 Define the next IA arrangement for top-level tabs and within-tab section order, including explicit placement for Google Drive browse/navigation, Drive search, and app-library search.
- [x] 1.3 Add non-regression acceptance criteria for critical existing capabilities (Drive root switching, folder navigation, breadcrumbs, source save/remove, track playback, loop creation, playlist playback).
- [x] 1.4 Add UI-level context labels and helper copy rules that prevent Drive features from being hidden or mislabeled after IA changes.
- [x] 1.5 Validate proposed IA against representative flows (discover in Drive -> save -> add to playlist -> play) and refine before component implementation.
- [x] 1.6 Build compact Recents mockups that include multiple shortcut modules (for example recents and popular tags) and capture design confirmation before implementation.
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
- [x] 3.8 Verify Google Drive navigation remains first-class after tab/section reorder inside Add: root selector, folder drill-down, breadcrumbs, visible search-scope continuity, and unavailable/source status visibility.
- [x] 3.9 Add Drive search-result preview playback so playable Google Drive sources can be auditioned without saving first, while keeping Save available as a separate action.
- [x] 3.10 Highlight matched query substrings in visible search-result text for both Add (Google Drive) and Library contexts, using the same normalized match semantics as result filtering.
- [x] 5.1 Add dedicated app-library search behavior over saved entities (tracks, loops, playlists, folders, tags) independent of Drive discovery search.
- [x] 5.2 Add tag assignment and tag-filter interactions for app-owned library entities without changing playback semantics.
- [x] 5.2.1 Ensure loops remain independently taggable even when default Library browsing reaches them through `View track loops` parent-track navigation.

### Playlist, Queue, and Playback Baseline

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
- [x] 4.2.7 Extend queue-action availability rules to every queue-capable item surface so users can create or grow a transient queue from standalone playback without first opening a playlist. Implement transient queue promotion when `Play next` or `Add to queue` is invoked during standalone single-track playback, keeping the current track as queue head and preserving uninterrupted playback.
- [x] 4.2.8 Surface queue-management affordances across queue-capable item surfaces once a transient or playlist-backed queue exists, while keeping queue-only controls hidden during true single-item playback with no queued follow-up.
- [x] 4.2.9 Add a `Create new playlist` action in the Up Next queue summary area to save the current queue order as a new playlist while preserving uninterrupted playback, then immediately treat the active queue as that new playlist for follow-up updates.
- [x] 4.2.10 Add an `Update current playlist` action in the Up Next queue summary area for playlist-backed queue sessions, confirm before replacing that playlist's saved items and order with the current queue order, and keep the active queue session unchanged.
- [x] 4.2.11 Constrain the active rehearsal queue list to a scrollable maximum height so the queue summary, queue-mode controls, and transport remain visible for long queues.
- [x] 4.2.12 Add active queue row controls for direct playback and reordering: per-row play buttons, drag handles, and overflow actions for remove, move to start, move to end, and move to a specific queue position.
- [x] 4.2.13 Add a move-to-position modal for queue rows with a slider bounded from queue position `1` through the last queue position, and apply the selected position without restarting playback.
- [x] 4.2.14 Remove redundant `Up next` / `Now playing` row text from the active queue once direct play controls exist, and keep current-item state legible through row styling and control state.
- [x] 4.2.15 Add previous and next track transport controls directly to the active rehearsal queue view.

### Row-Action, Loop, and Shared UI Baseline

- [x] 4.1 Add context-aware default loop naming in loop creation while preserving user override behavior before save.
- [x] 4.2 Align row-level action menus to include new queue-acceleration actions and maintain consistent icon semantics across Library and Add, while keeping saved track and saved loop rows behaviorally identical except for track-only loop creation.
- [x] 4.2.1 Apply the shared overflow menu UI to saved source rows (`DriveLibrarySourceGroup`) and route secondary/destructive actions into that menu.
- [x] 4.2.2 Introduce explicit row-action placement metadata (`inline` vs `menu`) with backward-compatible fallback logic and migrate current source/playlist callers.
- [x] 4.2.3 Replace heuristic action grouping rules with explicit placement-only behavior after caller migration and validation.
- [x] 4.2.4 Expand the shared overflow menu pattern to remaining row-action surfaces (for example loop rows and future queue quick-action entry points) so saved track and saved loop rows converge on the same top-level menu structure and icon semantics.
- [x] 4.2.5 Extract a shared overflow-trigger primitive (top-right vertical-ellipsis affordance) and adopt it in playlist, source, and future row-action surfaces.
- [x] 4.2.6 Converge playable row surfaces in Library and Add on one inline icon-only `Play` action plus a shared overflow trigger, while keeping `Make loop` as a saved-track-only overflow action.
- [x] 4.2.6.1 After row-action placement and quick-action semantics stabilize, extract a shared compact playable-row shell and adopt it in Add, Library, loop, and Recents row-style surfaces without collapsing surface-specific metadata, badges, or availability messaging.
- [x] 4.3 Ensure loop management remains parent-track-first while supporting optional promotion of loops to first-class organization surfaces.
- [x] 4.4 Add track-context loop management entry points (create, view, edit, remove) and preserve visible parent-track linkage in all loop surfaces, with `Make loop` living in saved track overflow only.
- [x] 4.4.1 Keep the default top-level Saved loops Library section and add a `View track loops` saved-track overflow action that opens a full-screen Library detail view for that track's loops when loops exist, while preserving loop action parity for playback, add to playlist, queue, and remove flows.
- [x] 4.4.2 Keep the track-scoped loop surface visibly tied to its parent track, make it replace the main Library browse UI with a back path while active, add ordered loop-series playback plus a `Make new loop` action for that track, and reuse the same shared loop row actions and metadata needed for fast playback and playlist workflows.
- [x] 4.5 Audit shell, playback, and queue surfaces for remaining text-labeled `Play` buttons, replace them with standard playback icons where appropriate, and update icon-only control labels, selected/disabled states, and touch-target sizing.
- [x] 4.5.1 Extract a shared icon-only playback-action primitive for repeated compact playback entry points (for example Add source rows, Recents rows and shortcut chips, and playlist cards) while keeping larger transport controls on their existing surface-specific components.
- [x] 4.5.2 Redesign playlist-detail fresh-start playback controls into icon-first ordered/shuffle actions, keep the active queue mode legible, and preserve a playlist-specific larger control surface instead of collapsing those actions into the compact row/card playback primitive.
- [x] 4.6 Extract shared interaction style tokens for card shells, action buttons, chips, and pressed/disabled states used by playlist/source/menu surfaces.
- [x] 4.6.1 Extract a shared contextual search panel scaffold for Add and Library search surfaces, reusing the input row, submit affordance, recent-search suggestions, and helper or clear-action slots while preserving each search context's copy and disabled rules.
- [x] 4.6.2 Extract a shared section-heading primitive with eyebrow, title, body copy, and optional trailing action, and adopt it in in-content Drive, Library, playlist, and modal entry surfaces where that structure already repeats. Do not use it for top-level compact destination headers.
- [x] 4.6.3 Extract a shared feedback-card family for status, issue, and empty states, and adopt it in Drive status, playlist creation and rename issues, and empty playlist-selector flows without changing workflow semantics.
- [x] 4.6.4 Extract a shared chip family for recent searches, Drive root selection, Recents shortcut tags, and future tag or filter surfaces with passive, selected, and action variants.
- [x] 4.7 Extract a shared centered dialog-card shell for rename/create/select flows and migrate existing playlist dialogs without changing workflow behavior.
- [x] 4.7.1 Move create-playlist entry into the Library Playlists section header with a right-aligned `+` trigger that opens the shared create modal with playlist name input, replacing any persistent bottom-of-Library creation component.
- [x] 4.7.2 Extract a shared modal-surface base beneath bottom-sheet and centered-dialog variants, then migrate playlist, selector, and loop-builder flows onto it without forcing one modal presentation across all cases.

## 2. Checkpointed Implementation Plan

Complete these steps in order. Each `2.x` group is one checkpoint, each `2.x.y` checkbox is the unit of execution to complete individually, and the original spec-task references are preserved in parentheses for traceability.

### 2.1 Shared Compact Destination Header

- [x] 2.1.1 Implement the remaining shared compact destination-header rollout across Recents, Add, and Library: remove large descriptive headers, keep destination titles leading, keep `Search` adjacent to the Drive session menu in Add, keep Add `Refresh` as the leading header action when the visible Drive context can refresh, keep `Filters` and `Search` adjacent in Library, place the Drive session menu trigger to the right of search when present, and preserve surface-specific trailing actions where search is not relevant (`3.8.1`).
- [x] 2.1.2 Add or finish UI coverage for compact destination-header and contextual-search adoption where this rollout changes behavior (`6.1.4` scoped to header and search-shell adoption).
- [x] 2.1.3 Manually verify Add refresh/search/session-menu ordering, Library filters/search/session-menu ordering, Drive session trigger placement, Recents title alignment, and shell-level non-regression for the touched surfaces (`6.2.5` and `6.2.6` scoped to header rollout).

### 2.2 Stabilize the Already-Shipped Queue, Playlist, and Shared-Action Behavior

- [x] 2.2.1 Backfill focused automated coverage for row-action placement, shared overflow trigger behavior, search-result highlighting, active queue behavior, and default playlist row controls (`6.1.1`, `6.1.2`, `6.1.3`, `6.1.5`, and `6.1.5.1`).
- [x] 2.2.2 Run manual regression for playlist row-start playback, playlist-card play icon behavior, Recents shortcut playback, transient queue promotion, queue-to-playlist capture, active queue controls, playlist-detail playback controls, and search highlight updates (`6.2`, `6.2.1`, `6.2.2`, `6.2.3`, `6.2.3.1`, `6.2.3.2`, and `6.2.4` scoped to the already-implemented non-Files surfaces).
- [x] 2.2.3 Record pass/fail against the non-regression baseline from task `1.1` for the capabilities touched in this step (`6.3` scoped to queue, playlist, search, and Recents behavior).
  - PASS: Recents live verification showed persisted recent rows, `Last played` labeling, inline icon-only play affordances, and the `Play next` / `Add to queue` / `View in library` overflow actions. The `View in library` handoff kept playback running.
  - PASS: Library search live verification showed the explicit `Search saved library` context, recent-query re-entry, and visible substring highlighting (`light` highlighted in `03 Lightning Strikes Twice.mp3`).
  - PASS: Playlist live verification showed icon-only playlist-card playback, playlist-detail ordered/shuffle playback controls, active-session detail copy, and default row-level reorder/playback controls.
  - PASS: Queue live verification showed the Up Next `Create new playlist` / `Update current playlist` actions, previous/next transport, and row-level play / drag / overflow affordances. Focused automated coverage also passed via `npx tsx --test` for Recents, playlist, queue, and library-search specs.

### 2.3 Introduce the File-Tree Storage Foundation

- [x] 2.3.1 Replace the current single-folder entity metadata approach with a file-tree storage model and migration path: folder nodes, file-link nodes, hard-link support, pointer-local visible names, canonical entity persistence, and last-link lifecycle semantics (`5.3` and `5.3.1`).
- [x] 2.3.2 Implement the Files mutation guardrails in the storage and helper layer: case-insensitive same-parent naming, duplicate-name conflict handling, case-insensitively unique `Copy` suffix defaults for same-folder copies, and folder-move prevention for self or descendant targets (`5.3.1.1`).
- [x] 2.3.3 Preserve loop parent-track provenance in the underlying model so loops remain identifiable across Files, search, tags, and folder results as later UI work lands (`5.4` and `5.4.1` foundation work).
- [x] 2.3.4 Add focused model and helper coverage for tree mutations, hard-link behavior, naming guardrails, and loop provenance wiring (`6.1` and `6.1.6` scoped to the data layer foundation).

### 2.4 Rebuild the Explorer Shell and Navigation Surfaces

- [x] 2.4.1 Rebuild Library Files around one mixed-list explorer shell with current-folder navigation chrome, horizontally scrollable breadcrumbs, leading type icons, row-body primary-action semantics, and a persistent Google Drive-style floating Files `+` create control (`5.3.2`).
- [x] 2.4.2 Align Add Drive browsing with the same explorer chrome and shared list primitives where the spec calls for parity, while preserving Drive-specific save and preview behavior (`5.3.2` on the Add surface).
- [x] 2.4.3 Ensure folder rows push onto a standard explorer stack, track and loop rows play in place, playlist rows preserve a back path to the originating Files folder, and dedicated Tracks, Loops, and Playlists views remain coherent beside Files (`5.3.2.1` and `5.3.4`).
- [x] 2.4.4 Extend UI coverage for the shared explorer and list primitives, then manually verify Add and Files explorer navigation, breadcrumb behavior, and playlist return-path behavior (`6.1.4`, `6.2.5`, and the navigation subset of `6.2.7`).

### 2.5 Implement Files Actions, Copy Flows, and Availability Recovery

- [x] 2.5.1 Implement Files overflow operations for folders and saved-entity links, keeping queue actions in the first menu level and reusing the existing tag editor, playlist selector, and loop-builder flows where applicable (`5.3.3`).
- [x] 2.5.2 Standardize per-entity explorer menu contents and ordering, including action-sheet dismissal through `Cancel`, destructive ordering, clear pointer-versus-entity deletion messaging for pointer-level `Delete from folder`, and explicit track-level `Remove from library` placement (`5.3.3.1`).
- [x] 2.5.3 Add `Create a copy`, rename, move, `Delete from folder`, folder-delete impact summaries, and connection-first broken-source recovery through `Reconnect` and `Remove from library` (`5.3.3` and `5.3.3.2`).
  - Wire existing Files menu placeholders to file-tree mutations for copy, pointer-local rename, move, and delete confirmations.
  - Add folder delete impact summaries and recovery actions for unavailable Drive-backed tracks without changing the dedicated entity views.
  - Keep root-folder and connection-first guardrails explicit, and leave broader automated coverage to task `2.5.4` after this behavior lands.
- [x] 2.5.4 Add focused coverage for Files menus, hard-link copy semantics, `Delete from folder` messaging (including explicit last-link confirmation), root-folder default visibility invariants, and recovery actions, then manually verify entity-specific explorer menus and naming or move guardrails (`6.1.6`, `6.2.7.1`, and `6.2.7.2` scoped to Files actions).
  - Extend the existing Files row/action and explorer model specs rather than adding a broader UI harness.
  - Cover operation-level copy/delete impact behavior with a lightweight repository fake so hard-link semantics and root-folder invariants are observable.
  - Automated coverage added and focused specs pass.
  - PASS: Live Files explorer verification in the VS Code integrated browser showed root-folder default visibility, disabled root back navigation, folder/track/loop-specific menu contents, destination picker current-folder labeling, self-move prevention for folders, duplicate-name conflict messaging, explicit last-link delete confirmation, folder-delete impact summaries, and the floating Files create menu without mutating the library.
  - PASS: Additional live folder flow verification moved a unique track into a folder, saved a loop from that folder-resident track into the same folder, and created a playlist from the folder create menu. Playlist creation initially left an extra root link; the Files create flow now moves the default root playlist link into the current folder, matching the loop save behavior, and focused coverage plus live verification confirm the fixed playlist appears in the folder without appearing at root.
- [ ] 2.5.5 Implement and test always-available track-level `Remove from library`: keep the action available during active playback and while track dependencies exist, show an explicit impact summary of affected loops/folder links/playlist entries, require explicit confirmation, and verify cascade cleanup across library entities and active playback context (`5.3.3.1`, `6.1.6`, and `6.2.7.2`).
- [ ] 2.5.6 Replace the temporary flat destination list for `Move to folder` and `Create a copy` with a proper folder-browser picker that supports navigating the Files hierarchy, selecting the target folder in context, preserving root/current-folder guardrails, and scaling beyond short folder lists (`5.3.3` and `6.2.7.1`).

### 2.6 Add Files Search, Sort, Restoration, and Loop-Result Integration

- [ ] 2.6.1 Add Files search behavior that defaults to the current folder subtree, supports an explicit `All Files` option, and shows containing-path metadata when results come from outside the currently visible folder list (`5.1.1` and `5.1.1.1`).
- [ ] 2.6.2 Add Files sort controls for `Name`, `Type`, `Date added`, and `Date opened`, including case-insensitive name sorting, folder-first grouping across modes, defined type/date ordering, and search results that continue to follow the active sort mode after filtering (`5.1.2` and `5.1.2.1`).
- [ ] 2.6.3 Restore Files path, breadcrumb stack, search scope/query, selected sort, and scroll position when users leave Files for another Library subview or top-level tab and return in the same session (`5.3.4.1` and the remaining state-restoration portion of `5.3.4`).
- [ ] 2.6.4 Finish loop provenance presentation in Files, search, tag, and folder results while keeping dedicated track-context loop browsing fast and clearly parent-linked (`5.4` and `5.4.1` UI integration).
- [ ] 2.6.5 Add focused coverage for Files search, sort, restoration, and result-group behavior, then manually verify the full Files organization/search contract end to end (`6.1.6`, `6.2.7`, and `6.2.7.3`).

### 2.7 Run Final Regression and Close Out the Change

- [ ] 2.7.1 Run the full rehearsal-critical manual regression across Recents, Add, Library, playlist detail, now-playing, queue, Files organization, and loop browsing after all prior steps have landed together (`6.2` through `6.2.7.3` as a final sweep).
- [ ] 2.7.2 Explicitly verify that no critical capability from the baseline mapping in task `1.1` regressed and record pass/fail by capability (`6.3` final pass).
- [ ] 2.7.3 Compare the final app surfaces against the proposal, design, and delta specs, and capture any intentional implementation deltas before considering the change complete (`6.4`).
- [ ] 2.7.4 Create the final tested checkpoint commit or release-candidate handoff after the full regression sweep.
