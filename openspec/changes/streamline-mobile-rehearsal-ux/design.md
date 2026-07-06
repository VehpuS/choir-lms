## Context

The mobile rehearsal player currently satisfies the MVP contract for discovery, saved library, loops, playlists, and waveform-first playback. The remaining friction is primarily interaction cost: playlist editing is slower than native music patterns, queue control is mostly inspection-only, and top-level surfaces carry more visual and copy weight than needed for repeat rehearsal sessions.

The product intent for this iteration is to improve speed-to-rehearsal without destabilizing playback correctness. The architecture already separates transport logic from UI state, so this iteration should remain UI-forward and additive, with minimal queue or domain changes.

## Current IA Baseline (Task 1.1)

The historical baseline before this change was ordered as Home, Search, and Library.
In the app today, those destinations are Library, Add, and Recents.
The notes below preserve the original IA rationale while mapping each user-visible capability to the destination or entry point where it appears today.

### Recents

- Hero and current app status summary.
- Continue practicing shortcut when an active item exists.
- Google Drive discovery is no longer housed in this surface.
- Drive root switching (My Drive vs Shared) now lives in Add.
- Drive folder drill-down now lives in Add.
- Drive breadcrumbs and jump navigation now live in Add.
- Drive browse status and unavailable/support messaging now live in Add.
- Save and remove source actions from Drive browse rows now live in Add.

### Add

- Drive search query input and submit/clear flow.
- Drive search result list (playable + unavailable).
- Save/Remove source action from search results.
- Search status, issue, and loading messaging for Drive context.

### Library

- Saved tracks list and playback-first row actions.
- Remove saved track action.
- Saved loops list and loop playback controls.
- Loop creation entry point from a saved track row.
- Loop save and remove flows.
- Playlist browse cards and detail entry.
- Playlist playback start and toggle from playlist surfaces.
- Add track to playlist from a row overflow menu.

### Cross-Surface / Shell-Level

- Top-level tab switching.
- Session and account actions through the Drive session menu.
- Mini-player persistence across tab switches.
- Now Playing surface entry point: tap mini-player body.
- Queue and Up Next surface entry point from the playback surface toggle.
- Global playback transport controls.

This baseline map is the non-regression reference for IA reorder work and feature continuity checks in section 6 validation tasks.

## Target IA Arrangement (Task 1.2)

Target top-level tabs are ordered as Library, Add, and Recents.

### Library Tab (primary, rehearsal-first)

Shared Library chrome order:

1. Compact screen header with destination title and contextual header actions
2. Library view buttons (`Files`, `Tracks`, `Loops`, `Playlists`)
3. Active-view chrome
4. Active view content
5. Contextual organization controls when the active view benefits from persistent filters

Top-level Library views:

1. Files
2. Tracks
3. Loops
4. Playlists

View responsibilities:

- Files: unified explorer-style browser for mixed saved entities. Tracks, loops, playlists, folders, and future file-like items are managed inside one hierarchical file tree using standard mobile file-explorer navigation patterns.
- Tracks: preserves the current saved-track-first browse flow, including playlist quick access and parent-track loop entry points.
- Loops: preserves direct saved-loop browsing and playback without requiring parent-track navigation.
- Playlists: preserves playlist-card and playlist-detail browsing patterns for focused playlist management.

Placement rules:

- `Files` is additive rather than replacing focused browsing; users can switch between the unified Files view and dedicated entity views without leaving Library.
- The compact Library header keeps the destination title on the leading side. When search is relevant in this slice, the trailing action cluster is ordered `Filters`, `Search`, and the Drive session menu trigger.
- The Library view switcher replaces the former description block and should render as four compact, first-class buttons labeled `Files`, `Tracks`, `Loops`, and `Playlists`.
- Do not render a separate large descriptive header block above the compact header row or the Library view buttons.
- When `Files` is active, the view-specific chrome below the compact header and Library view buttons should use explorer chrome: a standard current-folder navigation bar with a back-to-parent action and current-folder title; a horizontally scrollable breadcrumb path directly below; one vertically scrolling mixed-entity list below; and a separate floating create affordance scoped to the visible folder.
- The Files view is backed by folder nodes plus entity-link nodes rather than by storing a single `folderId` on each saved entity. A file link stores its parent folder and optional local display-name override, while the canonical track, loop, or playlist entity remains the source of playback metadata and shared tags.
- The Files view allows folders to contain subfolders plus tracks, loops, and playlists in the same flat explorer list; one underlying entity may also appear in multiple folders through hard links, and loops remain independently addressable inside folders without requiring parent-track navigation first.
- `Create a copy` is the user-facing hard-link creation action: it uses the same destination-picker pattern as `Move to folder`, creates a second file link instead of relocating the current one, and allows the current folder as a destination so users can keep multiple pointers to the same underlying entity.
- Renaming or moving a file link affects only that link; pointer-local rename is implemented as a local display-name override, while the canonical imported-source identity, Drive path, and saved entity record remain unchanged until the last link is removed.
- Standard explorer guardrails apply to every create, copy, rename, and move flow: name comparisons within the same parent folder are case-insensitive, case-only duplicates are rejected, same-folder copies default to a case-insensitively unique `Copy` suffix, and folders cannot be moved into themselves or any descendant.
- Editing entity metadata such as tags affects the underlying track, loop, or playlist across every link that points to it, while folder tags remain local to the folder node itself.
- Dedicated entity views preserve current row/card patterns, quick playback entry, and empty-state guidance instead of forcing all browsing through the Files view.
- App-library search remains separated from Add/Google Drive search and operates over the saved corpus; when Files is active, search defaults to the current folder path context and exposes an explicit option to broaden to all Files in the saved corpus, while dedicated views may pre-apply their entity filter.
- Files search should follow standard explorer behavior: current-folder scope means the current folder subtree by default, `All Files` broadens to the whole saved library corpus, and results outside the currently visible folder should show containing-path metadata so users can understand where each match lives.
- App-library search remains first-class in Library, but its entry lives in the compact header action cluster rather than as a persistent panel stacked above the file list. Files browsing at rest should still prioritize explorer navigation.
- Library filters are context-aware: the `Show` section appears only when the active Library view is `Files`, while Tracks, Loops, and Playlists omit that section because the view already fixes entity type.
- Files organization controls should expose explicit sort choices for `Name`, `Type`, `Date added`, and `Date opened`. `Name` is the default browse sort and compares visible names case-insensitively.
- Files sort should stay explorer-consistent across modes: folders remain grouped before non-folder items, `Type` groups by entity type after the folder group, `Date added` sorts newest-first within each folder/file grouping, and `Date opened` sorts most-recently-opened first within each grouping.
- When Files search results are shown, they should continue to respect the active Files sort mode after scope filtering rather than switching to an unrelated implicit ordering.
- When users leave Files for another Library view or top-level tab and return in the same app session, the explorer should restore its current folder path, breadcrumb state, search scope and query, selected sort, and scroll position instead of resetting to root.
- Track-focused browsing keeps a top-level Saved loops section available for cross-track access while also supporting parent-track loop management.
- Saved tracks that own one or more loops expose a `View track loops` overflow action so users can open a track-scoped loop view from the parent track context.
- Track-focused browsing continues to expose `View track loops` so parent-track loop management remains fast even though loops are also manageable as first-class file-like items in Files and folder results.
- The track-scoped loop view follows playlist-detail hierarchy: it replaces the main Library browse content while active, provides a back button to return, keeps the parent track visible, lists only that track's loops, supports ordered playback across those loops, and includes a `Make new loop` action for the same track.
- Search, tag, and folder result surfaces may still show loops in their own top-level result group because loops remain independent library entities.
- The track-scoped loop view keeps loops as actionable as saved tracks for playback, add-to-playlist, queue actions, and other applicable shared row actions.
- Every Files row uses one explorer row contract: a leading entity-type icon, primary name text, optional supporting metadata, a tappable row body that performs the primary navigation or playback action, and a trailing vertical-ellipsis overflow trigger.
- Primary row tap behavior follows standard explorer expectations: tapping a folder pushes the next folder level onto the explorer stack, tapping a track or loop starts the existing playback behavior without navigation, and tapping a playlist opens the existing playlist detail with an explicit back path to the originating Files folder context.
- Where the active navigator supports it, folder push navigation should preserve the platform-standard back-swipe gesture in addition to the visible back button.
- Saved track and saved loop rows in dedicated views continue to use the same visual action layout: one inline icon-only play control plus one vertical-ellipsis overflow trigger.
- All non-primary saved track and saved loop actions move into the overflow menu, including playlist-add and queue actions.
- `Make loop` remains available only from saved track overflow menus and is not mirrored onto saved loop rows.
- Playlist, track, and loop rows retain direct playback affordances and lightweight management actions.
- Explorer overflow menus should keep one predictable ordering contract to reduce choice overload: row-specific rehearsal actions first (`Play next`, `Add to queue`, `Add to playlist`, and track-only `Make loop` where applicable), file-management actions next (`Create a copy`, `Edit tags`, `Rename`, `Move to folder`), destructive `Remove` last, and `Cancel` handled as the dismissal affordance of the action-sheet surface rather than as a peer domain action.
- Files row actions should reuse existing Library flows where they already exist: the committed tag editor for `Edit tags`, the saved-item playlist selector for `Add to playlist`, and the current loop builder for track `Make loop`, rather than introducing file-specific duplicates of those surfaces.
- Broken-source feedback in Library should stay progressive and connection-first: show one top-level connected/disconnected Drive state before surfacing per-item issue states, and once connected, offer `Reconnect` and `Remove from library` on items whose underlying Drive source has moved or been deleted.
- Files track and loop links remain queue-capable item surfaces, so their overflow menus must keep the existing `Play next` and `Add to queue` actions in the first menu level alongside the new file operations rather than regressing to organization-only menus.
- Every Files remove action should ask for confirmation. Last-link removal must explain whether the action only removes the visible pointer or also deletes the underlying saved entity, and non-empty folder removal must summarize folder contents plus allow inspection of orphaned underlying entities before confirmation.
- The Files add action should follow familiar mobile file-explorer conventions: a persistent floating circular `+` button, visually modeled after the Google Drive create affordance, sits at the lower trailing edge above bottom safe-area chrome while Files is active rather than living in the header or breadcrumb bar.
- The floating Files `+` button stays visible while the explorer list scrolls, remains clear of the tab bar and mini-player, and opens a lightweight current-folder-scoped menu with `Create folder`, `Add tracks from Drive`, and `Create playlist` actions.

### Add Tab (Drive discovery-first)

Section order within Add:

1. Compact screen header with Add title and contextual header actions
2. Drive root selector (My Drive / Shared) and current-scope indicator
3. Explorer navigation bar for the active Drive folder/root
4. Breadcrumbs and current search scope indicator for the active folder path
5. One vertically scrolling explorer list for folders and sources

Placement rules:

- Add is the destination label for the Google Drive discovery surface; Search remains a first-class operation inside Add and is explicitly labeled as Google Drive discovery.
- Add should use the same explorer-shell mental model as Library Files rather than a stack of cards or grouped management panels: one path-oriented browse/search surface, one current location, and one list at a time.
- The compact Add header keeps the destination title on the leading side and keeps `Search` immediately to the left of the Drive session menu trigger. When the visible Drive context can refresh and search is not open, a leading `Refresh` action sits immediately to the left of `Search`.
- Add explorer chrome should mirror Files: a current-scope navigation bar with a back-to-parent action and title, a horizontally scrollable breadcrumb path below it, and one touch-first list beneath.
- Scope behavior is explicit: at root level, search runs across the selected Drive root; once users drill into a folder, search defaults to the current folder path context with visible scope state.
- Drive browse/navigation controls (root switching, folder path, breadcrumbs) stay available in the same surface as Drive search.
- Breadcrumbs and scope indicators remain directly below the header so the currently browsed folder context stays visibly coupled to the header-launched search state.
- Add rows should use the same leading-icon, primary-text, trailing-overflow pattern as Files where practical, while preserving Drive-specific primary actions such as preview playback and save.
- Folder taps in Add should push the next level onto the same explorer stack, preserve standard back navigation or gesture behavior where supported, and keep the active Drive root and current path visible throughout.
- Search results should render inside the same explorer shell and list treatment rather than swapping to a different card-based presentation mode.
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
- Recents uses the same compact destination-header pattern as Add and Library, but omits Add/Library-specific search and organization actions because they are not relevant on that surface.
- Recents modules remain compact and skimmable; discovery and library workflows remain fully accessible from Add and Library tabs directly.

### Cross-Tab Placement Guarantees

- Google Drive browse/navigation placement: Add tab contains root selector, breadcrumbs, and folder-aware context controls adjacent to Drive discovery search.
- Drive search placement: Add header action cluster with explicit Drive labeling, a leading refresh affordance when the visible Drive context can refresh, and breadcrumb or root-scope indicators directly below.
- App-library search placement: Library header action cluster with saved-library labeling, context-aware filters, and no Drive-result mixing.

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

### Capability: Explorer row primary actions

- Tapping a folder row pushes the next folder level and preserves a visible return path to the parent folder.
- Tapping a track or loop row starts the existing playback or preview behavior without navigating away from the current explorer path.
- Tapping a playlist row from Files opens playlist detail with a visible back path that returns to the originating Files folder context.

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

### Capability: Loop creation and editing

- Loop creation entry remains reachable from track context in saved library through the same overflow menu pattern used by other secondary row actions.
- Prepared loop-builder source state resolves correctly before edit/save actions.
- Saved loop appears in loop surfaces with parent-track linkage preserved.
- Saved loop rows expose `Edit loop` from the shared overflow menu in both top-level and track-scoped loop surfaces, including when the loop is currently active in playback.
- Saving loop edits updates any active queue or current-item loop context to the edited definition without requiring the user to rebuild playback context manually.

### Capability: Track and loop row parity

- Saved track and saved loop rows share the same card shell, inline action count, and overflow trigger placement.
- The only intentional action-set difference is that saved tracks expose `Make loop` and saved loops do not.
- Applicable shared actions such as add to playlist, play next, add to queue, and remove remain reachable from the first overflow menu level on both row types.

### Capability: Playlist playback

- User can launch playlist playback from playlist surfaces.
- Queue session metadata (mode, repeat, current item) remains coherent while navigating between tabs.
- Up Next/now-playing surfaces stay synchronized with playlist session state after IA changes.

### Capability: Queue-to-playlist persistence from Up Next

- User can use a single-row `Create new playlist` action in Up Next for any active queue, with an `Update current playlist` companion action when the active queue started from a saved playlist.
- User can create a new playlist from the active queue in Up Next without interrupting playback, and that active queue immediately becomes associated with the newly created playlist for subsequent updates.
- User can confirm replacing the saved items and order of the currently playing playlist with the current Up Next order, without interrupting playback.
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
- Unified library view label: Files
- Dedicated library view labels: Tracks, Loops, Playlists
- Acceleration destination label: Recents

`Search` is reserved for the operation itself in this slice and is not used as the middle top-level destination label.

These labels are user-facing defaults for compact headers, chips, and empty-state copy. Alternate synonyms such as Source, Cloud, or Files are not permitted for primary context labels in this slice.

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
- Files view helper: Manage saved items and folders
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
- Keep focused track and loop browsing fast while adding a unified Files view that can manage loops, tracks, and playlists as first-class folder items.
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

Where possible, use fast list behaviors (row taps, swipe actions, visible reorder handles, and concise menus) over heavy management panels.

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
- Up Next includes a single-row `Create new playlist` action for any active queue, plus `Update current playlist` only when the active queue is backed by a saved playlist.
- Creating a new playlist from Up Next promotes the active queue session to that newly created playlist immediately, so follow-up queue edits target the new playlist instead of the transient or previously bound source.
- The active rehearsal queue view keeps its queue summary area visible by capping queue-list height and making the list itself scroll.
- Queue rows expose direct play buttons plus drag handles, and overflow actions cover remove, move to start, move to end, and move to a specific queue index.
- Queue rows rely on control state and styling instead of redundant `Now playing` or `Up next` eyebrow text.
- Queue view includes previous and next track transport alongside the existing queue-mode controls.
- Queue-to-playlist actions persist queue ordering into playlists without restarting or rebuilding the active queue session; creating a new playlist rebinds that session to the saved playlist, and updating a playlist asks for confirmation before replacing that playlist's saved items and order.
- Queue affordances stay hidden only when playback is truly single-item with no queued follow-up items yet.

### 4. Tighten hierarchy by reducing non-critical copy and surface weight in steady-state screens

Recents and Add should bias toward immediate action over explanatory copy when users already have saved content.

### 5. Standardize overflow actions with a shared menu surface

Adopt one reusable overflow action pattern across library/search cards instead of one-off menu implementations.

### 6. Add a first-class Files view without replacing focused entity views

The library organization slice will introduce a unified Files view for mixed-entity folder management, while preserving dedicated Tracks, Loops, and Playlists views for the existing focused browsing patterns. Unlike a single-folder metadata approach, this Files surface should behave like a standard mobile file explorer and be backed by explicit file-tree nodes.

Explorer data model for this change:

- Canonical track, loop, and playlist entities remain the source of playback metadata, tags, and existing domain behavior.
- Folder nodes represent containers in the Files hierarchy and may store local folder metadata such as name and tags.
- Entity-link nodes represent one visible occurrence of a track, loop, or playlist inside the Files tree.
- Entity-link nodes store their parent folder, entity kind/id, and optional local display-name override.
- Multiple entity-link nodes may point to the same canonical entity, creating hard-link semantics across folders.
- Removing a file link removes only that link unless it was the last remaining link to the canonical entity.
- Renaming or moving a file link affects only that link; editing entity metadata affects every link pointing to that entity.

Alternatives considered:

- Extend only the track-first library surface with folders: rejected because mixed-entity folder management needs one shared surface that does not privilege a single entity type.
- Store a single `folderId` on the canonical entity: rejected because it cannot support multiple hard links, pointer-local rename, or last-link deletion semantics.
- Replace focused library views with Files-only navigation: rejected because rehearsal workflows still benefit from fast dedicated track, loop, and playlist browsing patterns.

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

Alternatives considered:

- Ship a single resume card only as the final state: rejected because users benefit from richer shortcut coverage.
- Ship a single explicit per-item resume row as an interim step before multi-item history: accepted as a low-risk transition to remove ambiguous playback affordances.
- Implement multiple modules without design validation: rejected due to high risk of visual crowding.

### 8. Reorder tab and component IA with a feature-preservation contract

Top-level tab reordering and within-tab component moves are allowed, but only under an explicit feature-preservation contract: Google Drive browse/navigation, search, save/remove, loops, playlists, queue playback, and mini-player continuity must remain fully reachable and testable after the reorder.

Alternatives considered:

- Keep current IA untouched to avoid risk: rejected because IA clarity improvements are a core part of this change.
- Reorder IA without explicit preservation checks: rejected because critical discovery features could be unintentionally deprioritized or lost.

### 9. Manage loops in track context first while preserving independent loop result surfaces

Loop creation and editing should remain attached to parent tracks without removing the top-level Saved loops section from Library. `View track loops` should open a track-scoped detail view for one parent track, while the broader Saved loops section remains available for cross-track access. Editing must remain available even when a saved loop is currently active in playback: opening edit should reuse the loop builder directly rather than forcing a separate pause-confirm step, and saving an edited active loop should resynchronize any affected queue or current-item playback context. This is a UI organization choice, not a change to loops' status as library objects: loops remain independently searchable, taggable, folderable, and displayable as their own result category in search, tag, and folder views.

Implementation guidance:

- Keep the default top-level saved-loops section in Library for cross-track access.
- When a saved track owns one or more loops, expose `View track loops` in the track overflow menu.
- The track-scoped loop view should behave like playlist detail for that track's loops: replace the main Library browse content while active, provide a back button that returns to the prior Library browse state, keep the parent track context visible, list only those loops, support ordered queued playback for the full set or an individual starting loop, and surface a `Make new loop` action for the same track.
- The track-scoped loop view must keep loops easy to play, add to playlist, queue, and otherwise manage through the same shared row-action model used for saved tracks where applicable.
- Saved loop rows in both the top-level and track-scoped loop surfaces should expose `Edit loop` and `Remove loop` from the shared overflow menu, and `Edit loop` should update the existing loop rather than creating a duplicate.
- If an edited loop is the current item or part of the active queue, saving should refresh that playback context to the updated loop metadata and timing without asking the user to reconstruct the queue by hand.
- Search, tag, and folder result surfaces should continue to show loops in their own result group with visible parent-track linkage, without requiring any extra enablement step.
- Tag and folder assignment apply directly to loops even when the default browse experience reaches them through parent-track context.

Alternatives considered:

- Treat loops as independent-only objects: rejected because provenance and editing context become harder.
- Keep loops only nested under tracks: rejected because power users need cross-track loop organization.

### 10. Support both reorder interaction paths in playlists without a separate edit mode

Playlist detail rows should support drag-and-drop reordering and explicit move controls simultaneously, with reorder affordances visible by default and lower-frequency mutations routed through overflow.

Implementation guidance:

- Remove the dedicated playlist edit toggle; playlist detail rows should expose reorder controls in the default detail view.
- Use a visible drag handle by default, following Apple-style reorder and drag-and-drop conventions so direct manipulation is discoverable without entering a separate mode.
- Order playlist row controls as: drag handle, standard play or pause control, tightly grouped up and down step controls on the trailing side, then the overflow trigger.
- Keep `Move to position` and `Remove` inside the shared overflow menu; `Move to position` reuses the same modal surface, one-based slider bounds, and confirm or cancel semantics as the active queue control so precision reordering behaves identically across both surfaces.
- Applying the selected playlist position should preserve playlist detail context and avoid restarting active playback when the edited playlist is currently playing.

Alternatives considered:

- Separate edit mode with additional top-level controls: rejected because it duplicates row affordances, adds scanning cost, and pushes lower-frequency actions out of the shared overflow pattern.
- Drag-and-drop only: rejected because explicit controls improve accessibility and precision.
- Explicit move controls only: rejected because drag-and-drop is faster for most reordering.

### 11. Provide search entry points in both Add and Library surfaces

Search should be available in both contexts as a first-class function through the compact header row: Drive search attached to Google Drive navigation inside Add and app-library search attached to saved library management inside Library. In Add, `Search` sits immediately to the left of the Drive session menu trigger and can be preceded by `Refresh` when the visible Drive context can refresh. In Library, `Filters` sits immediately to the left of `Search`, and the Drive session menu trigger sits to the right when search is relevant.

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

### 12. Ship tags, filters, and explorer-style file organization together as the first organization baseline

The initial organization baseline for this slice includes all three: tags, filters, and an explorer-style Files tree with hard links rather than lightweight single-folder metadata on canonical entities. In Library, the filter UI remains context-aware: the `Show` section appears only in Files because the dedicated Tracks, Loops, and Playlists views already imply entity type.

Alternatives considered:

- Tags+filters only for first ship: rejected because explicit file organization is also needed for user-controlled structure.

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

- Shared compact destination-header primitive: reusable top-of-screen header for Recents, Add, and Library with a leading destination title, optional trailing action slots, stable action ordering, and no large descriptive hero copy.
- Shared overflow trigger primitive: one top-right vertical-ellipsis button component with consistent accessibility, hit target, and pressed/disabled feedback.
- Shared overflow ordering contract: reusable menu ordering that keeps primary actions first, preserves stable order within the same priority group, and places destructive actions last across Library, Add, Recents, and playlist surfaces.
- Shared playback-action primitive: one reusable icon-only direct-playback button for repeated list and card entry points (for example Add source rows, Recents rows and shortcut chips, and playlist cards) with consistent play/pause/replay glyph semantics, accessibility labels, hit target sizing, and pressed/disabled feedback.
- Playlist-detail playback mode actions: a surface-specific ordered/shuffle control row that uses icon-first buttons with adjacent mode labels, keeps ordered as the default-emphasis start action while idle, and highlights the active queue mode when that playlist is already running.
- Shared contextual search panel: one reusable header-launched search scaffold for Add and Library contexts that keeps input styling, submit affordance, recent-search suggestions, and a context-specific helper or clear-action slot aligned while preserving Drive-versus-library copy and disabled rules.
- Shared section-heading primitive: reusable eyebrow, title, and body copy with an optional trailing action for in-content Drive, Library, playlist, and modal entry surfaces that already share that structure. Do not use this primitive for top-level compact destination headers.
- Shared feedback-card family: reusable tone-aware status, issue, and empty-state cards with title, message, and optional loading treatment.
- Shared chip family: reusable passive, selected, and action-chip variants for recent searches, Drive root selection, Recents shortcut tags, and future library tags and filters.
- Shared playable-row shell: reusable compact row or card scaffold for playable entities that standardizes title, metadata, optional message, badge placement, inline playback placement, and overflow positioning once row-action placement metadata and quick-action semantics have converged.
- Shared dialog-card shell primitive: reusable centered modal scaffold for rename/create/select dialogs, with existing content and actions preserved.
- Shared modal-surface base: reusable backdrop, spacing, and dismiss behavior for bottom-sheet and centered-dialog variants so shared modal flows can reuse one foundation without forcing one presentation style everywhere.
- Shared interaction style tokens: centralize repeated card, button, chip, and disabled/pressed tokens used by playlist, source, and menu surfaces.

The shared playback-action primitive is intended for compact row and card entry points, not for full-size transport controls in the mini-player or now-playing surface where a different scale and emphasis model is still appropriate. Playlist-detail ordered/shuffle start actions remain surface-specific for the same reason: they need larger mode-aware presentation than compact row-entry buttons, even though they should still be icon-first.

Sequence these extractions after behavior convergence rather than before it: compact destination headers, contextual search, section headings, and feedback cards can be extracted early; the playable-row shell should follow explicit row-action placement and compact playback-action convergence; chip variants should land alongside tags, filters, and search-scoping work; and the modal-surface base should land while playlist, selector, and loop-builder flows are already migrating onto shared dialog and sheet shells.

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
- [Explorer-style file organization adds model complexity] -> Separate canonical entities from file-tree nodes, keep dedicated entity views intact, and validate hard-link/remove semantics before widening the UI rollout.
- [Cross-platform differences for touch affordances] -> Validate on representative iOS and Android devices and keep behavior consistent where feasible.

## Migration Plan

1. Implement shell and list-hierarchy refinements that do not change playback semantics.
2. Produce compact Recents mockups that include multiple shortcut modules and complete a design sign-off checkpoint.
3. Add quick-win actions and defaults behind current UI-local state models.
4. Rename the middle destination from Search to Add across shell labels, file and component names, and repo guidance or skills that describe the destination.
5. Add explicit dual-search context and scoping behavior (Drive search vs library search) with clear active-state indicators in both surfaces.
6. Replace the current single-folder experiment with file-tree nodes and hard links, then build the Files explorer and shared Add/Files explorer primitives while preserving existing library behavior.
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

## Task 1.6 Terminology Rule

- Prefer explicit app entity language in Recents copy: tracks, loops, and playlists.
- Avoid introducing generic labels like "rehearsal" in user-facing Recents module titles and empty-state text.

## Task 1.6 Recents Density Decision

- Recents recent-items module supports vertical scrolling.
- Compact viewport shows 3 rows by default and 2 rows on smallest supported phone heights.
- Recent-items module cap is set to 50 entries.

## Open Questions

- None for Task 1.6.
