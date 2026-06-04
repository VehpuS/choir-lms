## Context

The mobile rehearsal player currently satisfies the MVP contract for discovery, saved library, loops, playlists, and waveform-first playback. The remaining friction is primarily interaction cost: playlist editing is slower than native music patterns, queue control is mostly inspection-only, and top-level surfaces carry more visual and copy weight than needed for repeat rehearsal sessions.

The product intent for this iteration is to improve speed-to-rehearsal without destabilizing playback correctness. The architecture already separates transport logic from UI state, so this iteration should remain UI-forward and additive, with minimal queue or domain changes.

## Current IA Baseline (Task 1.1)

Current top-level tabs are ordered as Home, Search, and Library.
In this change, the Home destination is renamed to Recents to match its optional acceleration role, and the current Search destination is renamed to Add so the middle tab describes Google Drive browse/search/add-to-library work.
Search is reserved as an operation name that remains available within both Add and Library.

### Home (to be renamed Recents)

- Hero and current app status summary: current Home tab root (`HomeScreen` hero block), which will be relabeled Recents.
- Continue practicing shortcut (when an active item exists): current Home tab summary card (`SummaryCard`), which will move under Recents label.
- Google Drive discovery panel container: current Home tab (`DriveDiscoveryPanel`), which will be relocated per target IA.
- Drive root switching (My Drive vs Shared): Home -> `DriveLibraryRootSelector`.
- Drive folder drill-down: Home -> `DriveFolderGroup` row tap.
- Drive breadcrumbs and jump navigation: Home -> `DriveLibraryBreadcrumbs`.
- Drive browse status and unavailable/support messaging: Home -> `DriveLibraryStatusCard` and unavailable source group.
- Save/Remove source action from Drive browse list: Home -> playable source rows (`DriveLibrarySourceGroup` with `getSourceAction`).

### Search (to be renamed Add)

- Drive search query input and submit/clear flow: current Search tab (`DriveLibrarySearchPanel`), which will be renamed Add while keeping Google Drive search inside it.
- Drive search result list (playable + unavailable): current Search tab (`DriveSearchResultsPanel` source groups).
- Save/Remove source action from search results: current Search tab source rows (`DriveLibrarySourceGroup` with `getSourceAction`).
- Search status/issue/loading messaging for Drive context: current Search tab (`DriveLibraryStatusCard` in search panel).

### Library

- Saved tracks list and playback-first row actions: Library tab (`SavedRehearsalLibrarySection` -> `DriveLibrarySourceGroup`).
- Remove saved track action: Library tab track row action (`Remove`).
- Saved loops list and loop playback controls: Library tab (`SavedLoopSection`).
- Loop creation entry point from saved track row: Library tab track row action (`Make loop`, opens loop builder prep).
- Loop save/remove flows: Library tab (`SavedLoopSection` + saved loop handlers).
- Playlist browse cards and detail entry: Library tab (`SavedPlaylistCardsList` to `SavedPlaylistSection`).
- Playlist playback start/toggle from playlist surfaces: Library tab (`SavedPlaylistSection` -> `togglePlaylistPlayback`).
- Add track to playlist from row "more options" menu: Library tab (`SavedTrackPlaylistMenuSurface`).

### Cross-Surface / Shell-Level

- Top-level tab switching: shell tab bar (`ShellTabBar` with current destinations Home/Search/Library, target labels Recents/Add/Library after rename).
- Session/account actions (authorize/clear Drive auth): header menu (`DriveSessionMenu`).
- Mini-player persistence across tab switches: bottom dock mini-player (`MobileShell`).
- Now Playing surface entry point: tap mini-player body.
- Queue/Up Next surface entry point: playback surface toggle from now playing view (`PlaybackSurface` queue surface).
- Global playback transport (play/pause/seek/skip/volume): playback surface controls wired from `MobileShell` callbacks.

This baseline map is the non-regression reference for IA reorder work and feature continuity checks in section 6 validation tasks.

## Target IA Arrangement (Task 1.2)

Target top-level tabs are ordered as Library, Add, and Recents.

### Library Tab (primary, rehearsal-first)

Section order within Library:

1. Library search entry (app-owned corpus only)
2. Filter and organization controls (entity type, availability, tags, optional folders)
3. Saved playlists quick-access cards
4. Saved tracks list (playback-first row actions)
5. Saved loops list (parent-track provenance visible)

Placement rules:

- App-library search is anchored at the top of Library as a first-class entry point and never mixed with raw Drive discovery results.
- Saved track and saved loop rows use the same visual action layout: one inline icon-only play control plus one vertical-ellipsis overflow trigger.
- All non-primary saved track and saved loop actions move into the overflow menu, including playlist-add and queue actions.
- `Make loop` remains available only from saved track overflow menus and is not mirrored onto saved loop rows.
- Playlist, track, and loop rows retain direct playback affordances and lightweight management actions.

### Add Tab (Drive discovery-first)

Section order within Add:

1. Drive context header (active corpus label + scope chip)
2. Drive root selector (My Drive / Shared) and current-scope indicator
3. Breadcrumbs for current folder path
4. Drive search input and recent queries (placed directly under breadcrumbs)
5. Search results (playable first, unavailable grouped second)

Placement rules:

- Add is the destination label for the Google Drive discovery surface; Search remains a first-class operation inside Add and is explicitly labeled as Google Drive discovery.
- Scope behavior is explicit: at root level, search runs across the selected Drive root; once users drill into a folder, search defaults to the current folder path context with visible scope state.
- Drive browse/navigation controls (root switching, folder path, breadcrumbs) stay available in the same surface as Drive search.
- Drive search control is positioned immediately below breadcrumbs so the currently browsed folder context is visually coupled to search scope.
- Playable Drive search rows provide direct preview playback without requiring a save-first step.
- Save remains a separate row action for users who want to promote a previewed source into Library-managed workflows.

### Recents Tab (optional acceleration)

Section order within Recents:

1. Continue rehearsal shortcut (resume current or most recent context)
2. Compact recents module
3. Optional quick shortcuts (for example popular tags)
4. Concise fallback guidance for empty-history state

Placement rules:

- Recents is never required to access Drive discovery or app-library search.
- Recents modules remain compact and skimmable; discovery and library workflows remain fully accessible from Add and Library tabs directly.

### Cross-Tab Placement Guarantees

- Google Drive browse/navigation placement: Add tab contains root selector, breadcrumbs, and folder-aware context controls adjacent to Drive discovery search.
- Drive search placement: Add tab top section with explicit Drive labeling and scope indicators.
- App-library search placement: Library tab top section with organization filters and no Drive-result mixing.

## Non-Regression Acceptance Criteria (Task 1.3)

IA reorder work cannot be considered acceptable unless every critical capability below is explicitly preserved.

### Capability: Drive root switching

- Entry point remains first-class in the Drive discovery surface.
- User can switch between My Drive and Shared roots without leaving the active tab.
- After switching roots, folder and source lists refresh to the selected root context.

### Capability: Folder navigation

- User can open folders from current Drive discovery results.
- Navigation depth changes update visible folder/source collections for the active path.
- User can return upward through the hierarchy without resetting active root unexpectedly.

### Capability: Breadcrumb navigation

- Breadcrumbs are visible while browsing nested Drive folders.
- Tapping any breadcrumb segment returns directly to that level.
- Breadcrumb state remains consistent after search scope changes or root switching.

### Capability: Source save/remove

- Save action remains available on Drive discovery/search rows for supported playable sources.
- Remove action remains available on saved-library rows with current safety messaging/confirmation behavior intact.
- Save/remove updates reflected state in both discovery/search and library surfaces without requiring app restart.

### Capability: Track playback

- User can start and toggle playback from saved track rows through the shared inline icon-only play control.
- Mini-player remains visible and accurate during tab changes while playback is active.
- Playback controls (toggle, seek, skip where applicable) continue to function with no IA-coupled regression.

### Capability: Loop creation

- Loop creation entry remains reachable from track context in saved library through the same overflow menu pattern used by other secondary row actions.
- Prepared loop-builder source state resolves correctly before edit/save actions.
- Saved loop appears in loop surfaces with parent-track linkage preserved.

### Capability: Track and loop row parity

- Saved track and saved loop rows share the same card shell, inline action count, and overflow trigger placement.
- The only intentional action-set difference is that saved tracks expose `Make loop` and saved loops do not.
- Applicable shared actions such as add to playlist, play next, add to queue, and remove remain reachable from the first overflow menu level on both row types.

### Capability: Playlist playback

- User can launch playlist playback from playlist surfaces.
- Queue session metadata (mode, repeat, current item) remains coherent while navigating between tabs.
- Up Next/now-playing surfaces stay synchronized with playlist session state after IA changes.

### Capability: Queue-to-playlist persistence from Now Playing

- User can use a single-row `Create new playlist` and `Update playlist` action group in Now Playing, adjacent to the current queue or playlist label and above the waveform.
- User can create a new playlist from the active queue in Now Playing without interrupting playback.
- User can update an existing playlist with currently enqueued items from Now Playing while preserving queue order.
- Queue-to-playlist actions keep active playback and queue position stable after the save/update completes.

### Capability: Active rehearsal queue view remains actionable at long lengths

- The active rehearsal queue view keeps its summary, queue-mode controls, and transport visible by capping queue-list height and letting the list scroll internally when many items are queued.
- Queue rows expose direct play controls and drag handles so users can jump playback or reorder without leaving the queue view.
- Queue row overflow actions include remove, move to start, move to end, and move to a specific queue position through a dedicated move modal.
- Current-item and upcoming-item state is communicated through row styling and play-control state rather than redundant `Now playing` or `Up next` eyebrow text.
- Queue view includes previous and next track transport so users can navigate the active queue without switching back to Now Playing.

### Acceptance Gate

- All capabilities above must pass manual verification in section 6 tasks before this change is considered implementation-complete.
- Any failed capability blocks final sign-off until either fixed or documented as an intentional, approved delta.

## UI Context Labels And Helper Copy Rules (Task 1.4)

To prevent Drive features from being hidden or mislabeled after IA updates, all search and browse surfaces must use explicit context labels and approved helper-copy patterns.

### Context Label Taxonomy

- Google Drive discovery destination label: Add
- Google Drive search context label: Google Drive
- App-owned library destination and context label: Library
- Acceleration destination label: Recents

`Search` is reserved for the operation itself in this slice and is not used as the middle top-level destination label.

These labels are user-facing defaults for headers, chips, and empty-state copy. Alternate synonyms such as Source, Cloud, or Files are not permitted for primary context labels in this slice.

### Required Visibility Rules

- Every search entry point must show the active context label adjacent to input affordances.
- Drive discovery surfaces must display active root and folder scope near search/browse controls.
- Library search surfaces must display that results are from saved library entities only.
- Recents surfaces must not present Drive-discovery copy as if Recents were a Drive browser.

### Approved Helper Copy Patterns

- Add destination helper: Browse or search Google Drive to add tracks
- Drive search helper: Search Google Drive
- Drive scope helper: Scope: This folder or Scope: My Drive / Shared
- Drive browse helper: Browse Google Drive folders and audio
- Library search helper: Search saved library
- Library corpus helper: Tracks, loops, playlists, folders, and tags
- Recents empty helper: No recent rehearsal yet. Start in Add or Library.

### Mislabelling Prevention Rules

- If results come from Drive discovery, helper copy must include Google Drive.
- If results come from saved entities, helper copy must include saved library or Library.
- Mixed-source result sets are not allowed in a single context view for this IA revision.
- Context switches must update labels and helper copy in the same render cycle as result changes.

### UX Review Checklist For Labels

- Verify the Add destination keeps Google Drive labeling visible at rest and during active query.
- Verify Library search surfaces clearly indicate saved-library context.
- Verify Drive root-switch UI does not lose Google Drive labeling after tab reorder.
- Verify breadcrumbs remain visually tied to Google Drive context copy.
- Verify empty, loading, and error states use matching context terminology.

## Representative Flow Validation And Refinements (Task 1.5)

Validated flow: discover in Drive -> save -> add to playlist -> play.

Validated flow: discover in Drive -> preview playback -> optionally save -> continue rehearsal.

Validated flow: first-use empty library -> discover -> save first track -> optionally create playlist -> play.

### Flow Walkthrough Against Target IA

1. Discover in Drive
   - User opens Add tab (Google Drive context is explicit).
   - User searches or browses within Drive scope (root selector + breadcrumbs visible).
   - User identifies playable source row in Drive results.

2. Save
   - User taps Save on Drive result row.
   - Row state confirms save and source becomes available in Library saved-track surfaces.

3. Add to playlist
   - User moves to Library tab.
   - User opens the shared row-level vertical-ellipsis menu for the saved track or loop, opens the playlist selection menu, and adds the item to the chosen playlist (or creates one).

4. Play
   - User opens playlist detail and starts playback from playlist controls.
   - Mini-player and now-playing/queue surfaces reflect active playlist session state.

### Preview-First Flow Walkthrough

1. Discover in Drive
   - User opens Add tab and finds a playable Google Drive source.

2. Preview without save
   - User taps inline play on the Drive result row.
   - Playback starts immediately and mini-player reflects the active preview item.

3. Optional save
   - User can save the source after previewing if they want Library-managed actions later.

4. Continue rehearsal
   - User can keep previewing additional Drive results, or switch to saved-library flows without ambiguity about current source context.

### Validation Outcome

- Flow is viable under target IA without requiring Recents as an entry step.
- Context boundaries remain understandable when labels from task 1.4 are applied.
- Existing save -> playlist -> playback chain remains reachable in 2-tab handoff (Add -> Library).
- Preview-first audition is viable in Add: users can play Drive results immediately before deciding to save.

### New-User Empty-Library Flow Walkthrough

1. First launch with no saved entities
   - User opens Recents and sees first-use helper guidance (no recent rehearsal yet).
   - Guidance points to Add and Library as primary next actions.

2. Discover first source in Drive
   - User opens Add tab and stays in explicit Google Drive context.
   - User browses or searches Drive and finds an available playable source.

3. Save first source
   - User taps Save from Drive results.
   - Save confirmation is visible and source is now present in Library saved tracks.

4. Optional playlist creation path
   - User opens Library and may add the newly saved track to a new or existing playlist.

5. Start playback
   - User starts playback from saved track row or playlist detail.
   - Mini-player appears and remains persistent during tab switches.

### Empty-Library Pass Criteria

- A first-time user can reach audible playback without pre-existing library content.
- No step in the first-use flow depends on Recents being populated.
- Empty states in Recents and Library provide explicit next-action guidance (Add and/or save-first actions).
- Drive discovery controls (root selector, breadcrumbs, scope) remain visible and understandable for first-time users.

### Refinements Before Component Implementation

- Keep a persistent success acknowledgement after save action long enough to support the Add -> Library handoff.
- Ensure Library tab lands on saved-track content with playlist actions immediately reachable (no hidden management mode required).
- Keep playlist quick-access cards above saved-track rows so add-to-playlist and playback-start paths stay short.
- Keep playlist creation anchored to the Playlists section header in Library so the create action is discoverable without a persistent bottom-of-Library component.
- Preserve mini-player continuity through the full flow so users can verify playback state while navigating.
- Include this validated flow in manual regression checks as a required pass scenario before sign-off.
- Ensure empty-library states include CTA copy that is action-oriented (for example Open Add or Save your first track).
- Ensure saved track and saved loop cards remain visually parallel in steady state: same inline icon-only play affordance, same overflow trigger position, and no extra inline secondary buttons.

## Goals / Non-Goals

**Goals:**

- Reduce tap count and decision overhead for common rehearsal actions across Recents, Add, Library, playlist detail, and queue.
- Distinguish source discovery search (Google Drive scoped/global within Add) from app-library search in Library so users understand which corpus is being queried.
- Improve interaction affordances so list manipulation and playback actions feel closer to modern mobile music app standards.
- Add low-risk usability wins that increase daily-use efficiency (resume, add-next actions, stronger defaults, and better feedback).
- Make loop management parent-track-first while supporting optional first-class library placement when users choose to organize loops independently.
- Reorder top-level tabs and within-tab components only when feature continuity is preserved for all existing critical capabilities.
- Preserve existing playback semantics, queue correctness, and waveform-first identity.

**Non-Goals:**

- Rebuild playlist or queue domain models.
- Introduce offline mode, collaboration, or new external integrations.
- Replace the shell architecture with new navigation frameworks.
- Redesign brand/theme foundations beyond targeted hierarchy and density refinements.
- Make Recents mandatory for core rehearsal flows; all essential discovery and library actions should remain available without Recents.

## Decisions

### 1. Treat this iteration as a UI-and-workflow enhancement layer over existing playback architecture

The implementation will prioritize screen-level and component-level interaction updates, while reusing existing queue construction and playback state models.

Alternatives considered:

- Rewrite queue and playlist internals for richer editing: rejected because current architecture is already correct for ordered/shuffle/repeat behavior and duplicates.
- Introduce broad visual redesign first: rejected because interaction friction is currently a larger usability constraint than visual identity.

### 2. Prioritize one-handed, native list interactions for playlist and library management

Where possible, use fast list behaviors (row taps, swipe actions, concise menus, and clearer edit modes) over heavy management panels.

Alternatives considered:

- Keep explicit utility controls only (Move up/Move down everywhere): rejected as slower and less native for repeated playlist edits.
- Move all management actions into dedicated full-screen editors: rejected due to increased navigation overhead.

### 3. Keep queue improvements additive while bringing direct queue editing into the active queue view

Add both high-value queue conveniences (`Play next` and `Add to queue`) while preserving existing queue ownership and playback consistency. Queue actions must work whether playback started from a playlist or from a single track: if the user is playing one item outside playlist context and then invokes a queue action, the system should promote that playback into a transient queue whose first item is the currently playing track and whose subsequent items reflect the ad-hoc queue action. This slice also includes direct queue editing in the active rehearsal queue view through per-row play controls, drag reordering, overflow move/remove actions, and bounded move-to-position controls.

Alternatives considered:

- Keep queue editing deferred outside this slice: rejected because long-queue usability and direct queue correction are now part of the requested workflow contract.
- Leave queue fully unchanged: rejected because users need at least one faster ad-hoc flow for rehearsal sequencing.
- Require users to start from a saved playlist before queue actions appear: rejected because it blocks common rehearsal behavior where singers audition one track first and decide what should play next only after playback has already started.

Transient queue rules for this change:

- Standalone single-item playback remains valid as the initial playback mode.
- `Play next` or `Add to queue` from any queue-capable surface during standalone playback promotes the current item into a transient queue session.
- The transient queue keeps the currently playing item as position 1 and adds subsequent items according to the invoked action (`Play next` inserts immediately after the current item; `Add to queue` appends to the end).
- Once any active queue session exists, now-playing and Up Next surfaces expose consistent queue-management affordances for both transient and playlist-backed queues.
- Now Playing includes a single-row `Create new playlist` and `Update playlist` action group adjacent to the current queue or playlist label and above the waveform.
- The active rehearsal queue view keeps the Now Playing summary area visible by capping queue-list height and making the list itself scroll.
- Queue rows expose direct play buttons plus drag handles, and overflow actions cover remove, move to start, move to end, and move to a specific queue index.
- Queue rows rely on control state and styling instead of redundant `Now playing` or `Up next` eyebrow text.
- Queue view includes previous and next track transport alongside the existing queue-mode controls.
- Queue-to-playlist actions persist queue ordering into playlists but do not mutate the active queue session as a side effect.
- Queue affordances stay hidden only when playback is truly single-item with no queued follow-up items yet.

### 4. Tighten hierarchy by reducing non-critical copy and surface weight in steady-state screens

Recents and Add should bias toward immediate action over explanatory copy when users already have saved content.

### 5. Standardize overflow actions with a shared menu surface

Adopt one reusable overflow action pattern across library/search cards instead of one-off menu implementations.

Implemented delta in this change:

- Shared `OptionsMenuSheet` now powers playlist management menus and track-context menu entry points.
- Playlist list cards and playlist detail cards use pinned top-right vertical-ellipsis triggers for overflow actions.
- `DriveLibrarySourceGroup` now uses the same overflow trigger and routes secondary/destructive actions (for example remove) into the shared menu.

Follow-on rollout direction:

- Extend the same overflow grouping to loop row actions when queue-acceleration actions (`Play next`, `Add to queue`) are introduced.
- Extend the same overflow grouping to Recents history rows so each recent item keeps an inline icon-only `Play` action plus a vertical-ellipsis menu for queue acceleration (`Play next`, `Add to queue`) and a `View in library` navigation handoff.
- Ensure queue-capable surfaces do not gate queue actions on persisted playlist mode alone; the same overflow actions must remain available while a transient queue can be created from the currently playing standalone item.
- Standardize saved loop cards with saved track cards for add-to-playlist affordances so both surfaces keep equivalent action placement, labels, and feedback behavior.
- Converge saved track and saved loop rows on one inline icon-only `Play` action plus a shared overflow trigger, while keeping `Make loop` as a saved-track-only overflow action.
- Keep overflow ordering predictable across row and card menus: primary actions first, then secondary or navigation actions, with destructive actions last while preserving declared order within each group.
- Replace text-labeled `Play` buttons with icon-first playback affordances wherever the control performs an immediate playback action and standard music-player iconography is sufficient.
- Add a top-level play icon on playlist cards for immediate playback start while preserving `Open playlist` for detail navigation and the existing overflow trigger for management actions such as rename and remove.
- Keep playlist-card rename in the Library surface: selecting `Rename playlist` from a playlist card overflow menu opens the rename dialog in place and preserves the user's current Library context, rather than navigating into playlist detail as an implementation shortcut.
- Use the same icon-first play treatment for Recents resume shortcuts and other shortcut cards that directly start playback.
- Keep one primary inline action per row when useful for speed (for example immediate playback), and place lower-frequency or destructive controls in the overflow menu.
- Keep icon semantics and touch target sizing aligned with playlist/search/library patterns as additional surfaces adopt this UI.

Recents handoff rule:

- `View in library` from a recent-item overflow menu should navigate to Library and focus the matching saved entity context when available, without interrupting active playback.

Alternatives considered:

- Keep dense explanatory cards universally visible: rejected because repeat users need speed more than onboarding copy.
- Remove guidance entirely: rejected because empty and error states still need clear recovery cues.

### 5. Explicitly model two search contexts with visible scope semantics

Search behavior should be split into two clearly labeled contexts: Google Drive discovery search (optionally folder scoped) and app-owned library search (tracks, loops, playlists, and organization metadata). UI should always indicate which context is active and what scope is applied.

Alternatives considered:

- Keep one combined search surface over all sources: rejected because mixed results hide ownership context and recovery paths.
- Keep separate surfaces but without explicit scope state: rejected because users cannot reliably predict result sets.

### 6. Rename Home to Recents and keep it optional, not a required workflow step

Recents provides persisted recent-session shortcuts (for example recent playback history and popular tags), but the IA should not depend on Recents for core tasks.

Alternatives considered:

- Keep Home naming even when not default: rejected because label clarity drops once the tab is primarily recency shortcuts.
- Remove the Recents tab entirely in this slice: rejected because there is still value in an optional acceleration surface for frequent users.

### 7. Validate compact Recents composition with mockups before implementation

Recents should surface multiple useful shortcut modules (for example recent rehearsal items and popular tags) only when the layout remains compact and scannable on representative phone sizes. A mockup review checkpoint is required before implementation.

Implementation status note:

- The current implementation slice ships a concrete per-item resume row (icon-only play action bound to a labeled recent item) to avoid ambiguous card-level play behavior.
- Persisted recent playback history across app relaunches and compact multi-item recent history remain a follow-on implementation step tracked as task `3.3.3`.

Alternatives considered:

- Ship a single resume card only as the final state: rejected because users benefit from richer shortcut coverage.
- Ship a single explicit per-item resume row as an interim step before multi-item history: accepted as a low-risk transition to remove ambiguous playback affordances.
- Implement multiple modules without design validation: rejected due to high risk of visual crowding.

### 8. Reorder tab and component IA with a feature-preservation contract

Top-level tab reordering and within-tab component moves are allowed, but only under an explicit feature-preservation contract: Google Drive browse/navigation, search, save/remove, loops, playlists, queue playback, and mini-player continuity must remain fully reachable and testable after the reorder.

Alternatives considered:

- Keep current IA untouched to avoid risk: rejected because IA clarity improvements are a core part of this change.
- Reorder IA without explicit preservation checks: rejected because critical discovery features could be unintentionally deprioritized or lost.

### 9. Manage loops in track context first, then optionally as first-class organized objects

Loop creation and editing should remain attached to parent tracks. Users may optionally organize loops as first-class entities via folders, tags, or filters when they want broader library-level loop management.

Alternatives considered:

- Treat loops as independent-only objects: rejected because provenance and editing context become harder.
- Keep loops only nested under tracks: rejected because power users need cross-track loop organization.

### 10. Support both reorder interaction paths in playlists, with icon-based explicit controls

Playlist editing should support drag-and-drop reordering and explicit move controls simultaneously, with explicit controls represented by clear icons instead of text buttons.

Alternatives considered:

- Drag-and-drop only: rejected because explicit controls improve accessibility and precision.
- Explicit move controls only: rejected because drag-and-drop is faster for most reordering.

### 11. Provide search entry points in both Add and Library surfaces

Search should be available in both contexts as a first-class function: Drive search attached to Google Drive navigation inside Add and app-library search attached to saved library management inside Library.

Alternatives considered:

- Default app-launch search to a single context: rejected because users need context-specific search where they are working.

### 11a. Highlight matched query text in search results across both search contexts

Search results in Add (Google Drive context) and Library (saved-entity context) should visually emphasize the exact text spans that match the active query so users can scan and validate relevance quickly.

Implementation guidance:

- Apply highlighting only when a non-empty normalized query is active in the current search context.
- Use the same tokenization and case-folding semantics as the context's existing search match logic so highlight behavior and result inclusion do not diverge.
- Highlight all matched spans in visible primary metadata (for example title and supporting subtitle fields when they contribute to matching), while keeping non-matching text unchanged.
- Keep highlight styling accessible and readable in all states (default, selected, pressed, disabled) and avoid relying on color alone.
- If a query changes or context switches between Add and Library, recompute highlighted spans in the same render cycle as result updates so stale highlights are not shown.

Alternatives considered:

- Show unhighlighted results only: rejected because users must infer relevance from dense text and scan time increases.
- Use separate fuzzy highlight semantics from actual match logic: rejected because visual emphasis can become misleading.

### 12. Ship tags, filters, and lightweight folders together as the first organization baseline

The initial organization baseline for this slice includes all three: tags, filters, and lightweight folders.

Alternatives considered:

- Tags+filters only for first ship: rejected because lightweight folders are also needed for user-controlled structure.

### 13. Standardize icon and accessibility semantics across shell, playback, and library actions

This slice will align icon behavior, accessibility labels, and state visibility for transport, queue, more-options, reorder, and destructive actions.

Implementation guidance:

- Treat direct playback-start actions as icon-first by default; avoid text-labeled `Play` buttons when a standard play glyph is sufficient for the context.
- Preserve descriptive copy as supporting metadata or adjacent labels when needed, but keep the actionable playback control itself icon-based across playlist cards, row quick actions, Recents shortcuts, and shell playback controls.

Alternatives considered:

- Keep current per-surface icon conventions: rejected due to learnability cost.

### 14. Replace heuristic action grouping with an explicit placement contract

Row-action surfaces should classify actions using explicit placement metadata (`inline` vs `menu`) rather than label- or tone-derived heuristics so behavior remains stable as labels, localization, and future actions evolve.

Implementation guidance:

- Add backward-compatible fallback logic initially, then migrate each caller to explicit placement metadata.
- Keep one primary quick action inline where speed matters (for example playback) and route secondary/destructive actions into overflow.
- Validate placement behavior with focused tests before removing fallback logic.

Alternatives considered:

- Keep heuristic placement rules: rejected because action placement can change unintentionally when copy or tone changes.

### 15. Introduce shared UI primitives for overflow, playback, and modal consistency

To reduce visual drift while preserving existing behavior, extract shared primitives for recurring interaction surfaces.

Implementation guidance:

- Shared overflow trigger primitive: one top-right vertical-ellipsis button component with consistent accessibility, hit target, and pressed/disabled feedback.
- Shared overflow ordering contract: reusable menu ordering that keeps primary actions first, preserves stable order within the same priority group, and places destructive actions last across Library, Add, Recents, and playlist surfaces.
- Shared playback-action primitive: one reusable icon-only direct-playback button for repeated list and card entry points (for example Add source rows, Recents rows and shortcut chips, and playlist cards) with consistent play/pause/replay glyph semantics, accessibility labels, hit target sizing, and pressed/disabled feedback.
- Shared contextual search panel: one reusable search scaffold for Add and Library contexts that keeps input styling, submit affordance, recent-search suggestions, and a context-specific helper or clear-action slot aligned while preserving Drive-versus-library copy and disabled rules.
- Shared section-heading primitive: reusable eyebrow, title, and body copy with an optional trailing action for Drive, Library, playlist, and modal entry surfaces that already share that structure.
- Shared feedback-card family: reusable tone-aware status, issue, and empty-state cards with title, message, and optional loading treatment.
- Shared chip family: reusable passive, selected, and action-chip variants for recent searches, Drive root selection, Recents shortcut tags, and future library tags and filters.
- Shared playable-row shell: reusable compact row or card scaffold for playable entities that standardizes title, metadata, optional message, badge placement, inline playback placement, and overflow positioning once row-action placement metadata and quick-action semantics have converged.
- Shared dialog-card shell primitive: reusable centered modal scaffold for rename/create/select dialogs, with existing content and actions preserved.
- Shared modal-surface base: reusable backdrop, spacing, and dismiss behavior for bottom-sheet and centered-dialog variants so shared modal flows can reuse one foundation without forcing one presentation style everywhere.
- Shared interaction style tokens: centralize repeated card, button, chip, and disabled/pressed tokens used by playlist, source, and menu surfaces.

The shared playback-action primitive is intended for compact row and card entry points, not for full-size transport controls in the mini-player or now-playing surface where a different scale and emphasis model is still appropriate.

Sequence these extractions after behavior convergence rather than before it: contextual search, section headings, and feedback cards can be extracted early; the playable-row shell should follow explicit row-action placement and compact playback-action convergence; chip variants should land alongside tags, filters, and search-scoping work; and the modal-surface base should land while playlist, selector, and loop-builder flows are already migrating onto shared dialog and sheet shells.

Library playlist creation should use the shared dialog-card shell: the Playlists section header exposes a right-aligned `+` action that opens the create-playlist modal with playlist name input, create/confirm, and cancel behavior.

Alternatives considered:

- Continue duplicating per-surface style primitives: rejected because duplication increases drift risk and slows iterative UI updates.
- Introduce one generic button or generic card primitive for all surfaces: rejected because current surfaces still differ more in semantics and hierarchy than in paint tokens, so the abstraction would be too leaky for this slice.
- Merge compact row and card playback entry with full-size transport controls: rejected because mini-player and now-playing transport controls require separate scale, emphasis, and spacing rules.

## Risks / Trade-offs

- [Gesture-first list updates may conflict with existing row actions] -> Keep explicit fallback actions and test destructive/edit states with accessibility enabled.
- [Queue quick actions could confuse playlist-vs-session ownership] -> Keep labels explicit and preserve persisted playlist order as source of truth.
- [Reducing copy density may hurt first-run clarity] -> Keep richer guidance in empty and unavailable states only.
- [UI polish-only slice may under-deliver if users expect larger feature additions] -> Include a focused quick-wins set with measurable interaction savings.
- [Two search contexts may feel fragmented] -> Use explicit active-context labels, scoped chips, and predictable entry points.
- [IA reorder may hide Drive discovery/navigation in secondary paths] -> Require feature mapping before reorder and non-regression verification after each IA pass.
- [Optional folder organization could add metadata complexity] -> Keep folders additive and optional; baseline flows must work with tags/filters alone.
- [Cross-platform differences for touch affordances] -> Validate on representative iOS and Android devices and keep behavior consistent where feasible.

## Migration Plan

1. Implement shell and list-hierarchy refinements that do not change playback semantics.
2. Produce compact Recents mockups that include multiple shortcut modules and complete a design sign-off checkpoint.
3. Add quick-win actions and defaults behind current UI-local state models.
4. Rename the middle destination from Search to Add across shell labels, file and component names, and repo guidance or skills that describe the destination.
5. Add explicit dual-search context and scoping behavior (Drive search vs library search) with clear active-state indicators in both surfaces.
6. Add organization baseline features (tags, filters, lightweight folders) while preserving existing library behavior.
7. Add or update automated tests for view-model and interaction helpers where behavior changes.
8. Run manual regression on rehearsal-critical flows: start playback from playlist row, loop save/preview, queue mode changes, mini-player persistence, and both search contexts.
9. If regressions are found, fall back to existing explicit controls while keeping non-breaking hierarchy improvements.

## Task 1.6 Mockup Package

- Mockup artifact: `openspec/changes/streamline-mobile-rehearsal-ux/mockups/recents-compact.md`
- Included states: first-use empty history and active-user recent history.
- Included modules: Continue from last item, compact recent tracks/loops/playlists list, and popular tags shortcuts.
- Density fallback guidance included for constrained phone heights.

## Task 1.6 Design Confirmation Status

- Status: Ready for review.
- Confirmation checkpoint: pending reviewer sign-off that the Recents composition remains compact and scannable while keeping Add and Library as explicit alternatives.
- Implementation rollout note: current Recents implementation includes explicit single-item per-row resume plus popular tags shortcuts, with compact multi-item recent history queued as follow-on task `3.3.3`.
- Implementation rollout note: current Recents implementation includes explicit single-item per-row resume plus popular tags shortcuts, with persisted recent history and compact multi-item recent history queued as follow-on task `3.3.3`.

## Task 1.6 Terminology Rule

- Prefer explicit app entity language in Recents copy: tracks, loops, and playlists.
- Avoid introducing generic labels like "rehearsal" in user-facing Recents module titles and empty-state text.

## Task 1.6 Recents Density Decision

- Recents recent-items module supports vertical scrolling.
- Compact viewport shows 3 rows by default and 2 rows on smallest supported phone heights.
- Recent-items module cap is set to 50 entries.

## Open Questions

- None for Task 1.6.
