## Context

The mobile rehearsal player currently satisfies the MVP contract for discovery, saved library, loops, playlists, and waveform-first playback. The remaining friction is primarily interaction cost: playlist editing is slower than native music patterns, queue control is mostly inspection-only, and top-level surfaces carry more visual and copy weight than needed for repeat rehearsal sessions.

The product intent for this iteration is to improve speed-to-rehearsal without destabilizing playback correctness. The architecture already separates transport logic from UI state, so this iteration should remain UI-forward and additive, with minimal queue or domain changes.

## Current IA Baseline (Task 1.1)

Current top-level tabs are ordered as Home, Search, and Library.
In this change, the Home destination is renamed to Recents to match its optional acceleration role.

### Home (to be renamed Recents)

- Hero and current app status summary: current Home tab root (`HomeScreen` hero block), which will be relabeled Recents.
- Continue practicing shortcut (when an active item exists): current Home tab summary card (`SummaryCard`), which will move under Recents label.
- Google Drive discovery panel container: current Home tab (`DriveDiscoveryPanel`), which will be relocated per target IA.
- Drive root switching (My Drive vs Shared): Home -> `DriveLibraryRootSelector`.
- Drive folder drill-down: Home -> `DriveFolderGroup` row tap.
- Drive breadcrumbs and jump navigation: Home -> `DriveLibraryBreadcrumbs`.
- Drive browse status and unavailable/support messaging: Home -> `DriveLibraryStatusCard` and unavailable source group.
- Save/Remove source action from Drive browse list: Home -> playable source rows (`DriveLibrarySourceGroup` with `getSourceAction`).

### Search

- Drive search query input and submit/clear flow: Search tab (`DriveLibrarySearchPanel`).
- Drive search result list (playable + unavailable): Search tab (`DriveSearchResultsPanel` source groups).
- Save/Remove source action from search results: Search tab source rows (`DriveLibrarySourceGroup` with `getSourceAction`).
- Search status/issue/loading messaging for Drive context: Search tab (`DriveLibraryStatusCard` in search panel).

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

- Top-level tab switching: shell tab bar (`ShellTabBar` with current destinations Home/Search/Library, target label Recents/Search/Library).
- Session/account actions (authorize/clear Drive auth): header menu (`DriveSessionMenu`).
- Mini-player persistence across tab switches: bottom dock mini-player (`MobileShell`).
- Now Playing surface entry point: tap mini-player body.
- Queue/Up Next surface entry point: playback surface toggle from now playing view (`PlaybackSurface` queue surface).
- Global playback transport (play/pause/seek/skip/volume): playback surface controls wired from `MobileShell` callbacks.

This baseline map is the non-regression reference for IA reorder work and feature continuity checks in section 6 validation tasks.

## Target IA Arrangement (Task 1.2)

Target top-level tabs are ordered as Library, Search, and Recents.

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

### Search Tab (Drive discovery-first)

Section order within Search:

1. Drive context header (active corpus label + scope chip)
2. Drive search input and recent queries
3. Drive root selector (My Drive / Shared) and current-scope indicator
4. Breadcrumbs for current folder path
5. Search results (playable first, unavailable grouped second)

Placement rules:

- Drive search remains first-class in this tab and is explicitly labeled as Google Drive discovery.
- Scope behavior is explicit: users can search current folder scope or broader Drive scope with visible state.
- Drive browse/navigation controls (root switching, folder path, breadcrumbs) stay available in the same surface as Drive search.

### Recents Tab (optional acceleration)

Section order within Recents:

1. Continue rehearsal shortcut (resume current or most recent context)
2. Compact recents module
3. Optional quick shortcuts (for example popular tags)
4. Concise fallback guidance for empty-history state

Placement rules:

- Recents is never required to access Drive discovery or app-library search.
- Recents modules remain compact and skimmable; discovery and library workflows remain fully accessible from Search and Library tabs directly.

### Cross-Tab Placement Guarantees

- Google Drive browse/navigation placement: Search tab contains root selector, breadcrumbs, and folder-aware context controls adjacent to Drive discovery search.
- Drive search placement: Search tab top section with explicit Drive labeling and scope indicators.
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

### Acceptance Gate

- All seven capabilities above must pass manual verification in section 6 tasks before this change is considered implementation-complete.
- Any failed capability blocks final sign-off until either fixed or documented as an intentional, approved delta.

## UI Context Labels And Helper Copy Rules (Task 1.4)

To prevent Drive features from being hidden or mislabeled after IA updates, all search and browse surfaces must use explicit context labels and approved helper-copy patterns.

### Context Label Taxonomy

- Google Drive context label: Google Drive
- App-owned library context label: Library
- Acceleration context label: Recents

These labels are user-facing defaults for headers, chips, and empty-state copy. Alternate synonyms such as Source, Cloud, or Files are not permitted for primary context labels in this slice.

### Required Visibility Rules

- Every search entry point must show the active context label adjacent to input affordances.
- Drive discovery surfaces must display active root and folder scope near search/browse controls.
- Library search surfaces must display that results are from saved library entities only.
- Recents surfaces must not present Drive-discovery copy as if Recents were a Drive browser.

### Approved Helper Copy Patterns

- Drive search helper: Search Google Drive
- Drive scope helper: Scope: This folder or Scope: My Drive / Shared
- Drive browse helper: Browse Google Drive folders and audio
- Library search helper: Search saved library
- Library corpus helper: Tracks, loops, playlists, folders, and tags
- Recents empty helper: No recent rehearsal yet. Start in Search or Library.

### Mislabelling Prevention Rules

- If results come from Drive discovery, helper copy must include Google Drive.
- If results come from saved entities, helper copy must include saved library or Library.
- Mixed-source result sets are not allowed in a single context view for this IA revision.
- Context switches must update labels and helper copy in the same render cycle as result changes.

### UX Review Checklist For Labels

- Verify context label appears in Search and Library headers at rest and during active query.
- Verify Drive root-switch UI does not lose Google Drive labeling after tab reorder.
- Verify breadcrumbs remain visually tied to Google Drive context copy.
- Verify empty, loading, and error states use matching context terminology.

## Representative Flow Validation And Refinements (Task 1.5)

Validated flow: discover in Drive -> save -> add to playlist -> play.

Validated flow: first-use empty library -> discover -> save first track -> optionally create playlist -> play.

### Flow Walkthrough Against Target IA

1. Discover in Drive
   - User opens Search tab (Google Drive context is explicit).
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

### Validation Outcome

- Flow is viable under target IA without requiring Recents as an entry step.
- Context boundaries remain understandable when labels from task 1.4 are applied.
- Existing save -> playlist -> playback chain remains reachable in 2-tab handoff (Search -> Library).

### New-User Empty-Library Flow Walkthrough

1. First launch with no saved entities
   - User opens Recents and sees first-use helper guidance (no recent rehearsal yet).
   - Guidance points to Search and Library as primary next actions.

2. Discover first source in Drive
   - User opens Search tab and stays in explicit Google Drive context.
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
- Empty states in Recents and Library provide explicit next-action guidance (Search and/or save-first actions).
- Drive discovery controls (root selector, breadcrumbs, scope) remain visible and understandable for first-time users.

### Refinements Before Component Implementation

- Keep a persistent success acknowledgement after save action long enough to support the Search -> Library handoff.
- Ensure Library tab lands on saved-track content with playlist actions immediately reachable (no hidden management mode required).
- Keep playlist quick-access cards above saved-track rows so add-to-playlist and playback-start paths stay short.
- Preserve mini-player continuity through the full flow so users can verify playback state while navigating.
- Include this validated flow in manual regression checks as a required pass scenario before sign-off.
- Ensure empty-library states include CTA copy that is action-oriented (for example Open Search or Save your first track).
- Ensure saved track and saved loop cards remain visually parallel in steady state: same inline icon-only play affordance, same overflow trigger position, and no extra inline secondary buttons.

## Goals / Non-Goals

**Goals:**

- Reduce tap count and decision overhead for common rehearsal actions across Recents, Search, Library, playlist detail, and queue.
- Distinguish source discovery search (Google Drive scoped/global) from app-library search so users understand which corpus is being queried.
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

### 3. Keep queue improvements additive and defer full queue editing if risk rises

Add both high-value queue conveniences (`Play next` and `Add to queue`) while preserving existing queue ownership and playback consistency. Full queue reorder/remove can remain deferred if validation indicates too much complexity for this slice.

Alternatives considered:

- Ship full queue reordering in the same slice by default: rejected as potentially higher regression risk around active playback transitions.
- Leave queue fully unchanged: rejected because users need at least one faster ad-hoc flow for rehearsal sequencing.

### 4. Tighten hierarchy by reducing non-critical copy and surface weight in steady-state screens

Recents and Search should bias toward immediate action over explanatory copy when users already have saved content.

### 5. Standardize overflow actions with a shared menu surface

Adopt one reusable overflow action pattern across library/search cards instead of one-off menu implementations.

Implemented delta in this change:

- Shared `OptionsMenuSheet` now powers playlist management menus and track-context menu entry points.
- Playlist list cards and playlist detail cards use pinned top-right vertical-ellipsis triggers for overflow actions.
- `DriveLibrarySourceGroup` now uses the same overflow trigger and routes secondary/destructive actions (for example remove) into the shared menu.

Follow-on rollout direction:

- Extend the same overflow grouping to loop row actions when queue-acceleration actions (`Play next`, `Add to queue`) are introduced.
- Standardize saved loop cards with saved track cards for add-to-playlist affordances so both surfaces keep equivalent action placement, labels, and feedback behavior.
- Converge saved track and saved loop rows on one inline icon-only `Play` action plus a shared overflow trigger, while keeping `Make loop` as a saved-track-only overflow action.
- Replace text-labeled `Play` buttons with icon-first playback affordances wherever the control performs an immediate playback action and standard music-player iconography is sufficient.
- Add a top-level play icon on playlist cards for immediate playback start while preserving `Open playlist` for detail navigation and the existing overflow trigger for management actions.
- Use the same icon-first play treatment for Recents resume shortcuts and other shortcut cards that directly start playback.
- Keep one primary inline action per row when useful for speed (for example immediate playback), and place lower-frequency or destructive controls in the overflow menu.
- Keep icon semantics and touch target sizing aligned with playlist/search/library patterns as additional surfaces adopt this UI.

Alternatives considered:

- Keep dense explanatory cards universally visible: rejected because repeat users need speed more than onboarding copy.
- Remove guidance entirely: rejected because empty and error states still need clear recovery cues.

### 5. Explicitly model two search contexts with visible scope semantics

Search behavior should be split into two clearly labeled contexts: Google Drive discovery search (optionally folder scoped) and app-owned library search (tracks, loops, playlists, and organization metadata). UI should always indicate which context is active and what scope is applied.

Alternatives considered:

- Keep one combined search surface over all sources: rejected because mixed results hide ownership context and recovery paths.
- Keep separate surfaces but without explicit scope state: rejected because users cannot reliably predict result sets.

### 6. Rename Home to Recents and keep it optional, not a required workflow step

Recents provides recent-session shortcuts (for example recent playback and popular tags), but the IA should not depend on Recents for core tasks.

Alternatives considered:

- Keep Home naming even when not default: rejected because label clarity drops once the tab is primarily recency shortcuts.
- Remove the Recents tab entirely in this slice: rejected because there is still value in an optional acceleration surface for frequent users.

### 7. Validate compact Recents composition with mockups before implementation

Recents should surface multiple useful shortcut modules (for example recent rehearsal items and popular tags) only when the layout remains compact and scannable on representative phone sizes. A mockup review checkpoint is required before implementation.

Alternatives considered:

- Ship a single resume card only: rejected because users benefit from richer shortcut coverage.
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

### 11. Provide search entry points in both Drive discovery and app-library surfaces

Search should be available in both contexts as a first-class function: Drive search attached to Google Drive navigation and app-library search attached to saved library management.

Alternatives considered:

- Default app-launch search to a single context: rejected because users need context-specific search where they are working.

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

### 15. Introduce shared UI primitives for overflow and modal consistency

To reduce visual drift while preserving existing behavior, extract shared primitives for recurring interaction surfaces.

Implementation guidance:

- Shared overflow trigger primitive: one top-right vertical-ellipsis button component with consistent accessibility, hit target, and pressed/disabled feedback.
- Shared dialog-card shell primitive: reusable centered modal scaffold for rename/create/select dialogs, with existing content and actions preserved.
- Shared interaction style tokens: centralize repeated card, button, chip, and disabled/pressed tokens used by playlist, source, and menu surfaces.

Alternatives considered:

- Continue duplicating per-surface style primitives: rejected because duplication increases drift risk and slows iterative UI updates.

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
4. Add explicit dual-search context and scoping behavior (Drive search vs library search) with clear active-state indicators in both surfaces.
5. Add organization baseline features (tags, filters, lightweight folders) while preserving existing library behavior.
6. Add or update automated tests for view-model and interaction helpers where behavior changes.
7. Run manual regression on rehearsal-critical flows: start playback from playlist row, loop save/preview, queue mode changes, mini-player persistence, and both search contexts.
8. If regressions are found, fall back to existing explicit controls while keeping non-breaking hierarchy improvements.

## Task 1.6 Mockup Package

- Mockup artifact: `openspec/changes/streamline-mobile-rehearsal-ux/mockups/recents-compact.md`
- Included states: first-use empty history and active-user recent history.
- Included modules: Continue from last item, compact recent tracks/loops/playlists list, and popular tags shortcuts.
- Density fallback guidance included for constrained phone heights.

## Task 1.6 Design Confirmation Status

- Status: Ready for review.
- Confirmation checkpoint: pending reviewer sign-off that the Recents composition remains compact and scannable while keeping Search and Library as explicit alternatives.

## Task 1.6 Terminology Rule

- Prefer explicit app entity language in Recents copy: tracks, loops, and playlists.
- Avoid introducing generic labels like "rehearsal" in user-facing Recents module titles and empty-state text.

## Task 1.6 Recents Density Decision

- Recents recent-items module supports vertical scrolling.
- Compact viewport shows 3 rows by default and 2 rows on smallest supported phone heights.
- Recent-items module cap is set to 50 entries.

## Open Questions

- None for Task 1.6.
