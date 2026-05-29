## Context

The mobile rehearsal player currently satisfies the MVP contract for discovery, saved library, loops, playlists, and waveform-first playback. The remaining friction is primarily interaction cost: playlist editing is slower than native music patterns, queue control is mostly inspection-only, and top-level surfaces carry more visual and copy weight than needed for repeat rehearsal sessions.

The product intent for this iteration is to improve speed-to-rehearsal without destabilizing playback correctness. The architecture already separates transport logic from UI state, so this iteration should remain UI-forward and additive, with minimal queue or domain changes.

## Goals / Non-Goals

**Goals:**

- Reduce tap count and decision overhead for common rehearsal actions across Home, Search, Library, playlist detail, and queue.
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
- Make Home mandatory for core rehearsal flows; all essential discovery and library actions should remain available without Home.

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

Add both high-value queue conveniences (`Play next` and `Add to Up Next`) while preserving existing queue ownership and playback consistency. Full queue reorder/remove can remain deferred if validation indicates too much complexity for this slice.

Alternatives considered:

- Ship full queue reordering in the same slice by default: rejected as potentially higher regression risk around active playback transitions.
- Leave queue fully unchanged: rejected because users need at least one faster ad-hoc flow for rehearsal sequencing.

### 4. Tighten hierarchy by reducing non-critical copy and surface weight in steady-state screens

Home and Search should bias toward immediate action over explanatory copy when users already have saved content.

Alternatives considered:

- Keep dense explanatory cards universally visible: rejected because repeat users need speed more than onboarding copy.
- Remove guidance entirely: rejected because empty and error states still need clear recovery cues.

### 5. Explicitly model two search contexts with visible scope semantics

Search behavior should be split into two clearly labeled contexts: Google Drive discovery search (optionally folder scoped) and app-owned library search (tracks, loops, playlists, and organization metadata). UI should always indicate which context is active and what scope is applied.

Alternatives considered:

- Keep one combined search surface over all sources: rejected because mixed results hide ownership context and recovery paths.
- Keep separate surfaces but without explicit scope state: rejected because users cannot reliably predict result sets.

### 6. Treat Home as optional acceleration, not a required workflow step

Home can provide recents and shortcuts (for example recent playback and popular tags), but the IA should not depend on Home for core tasks.

Alternatives considered:

- Make Home the required entry for discovery and resume: rejected because it adds an avoidable navigation hop.
- Remove Home entirely in this slice: rejected because there is still value in an optional dashboard for frequent users.

### 7. Validate compact Home composition with mockups before implementation

Home should surface multiple useful shortcut modules (for example recent rehearsal items and popular tags) only when the layout remains compact and scannable on representative phone sizes. A mockup review checkpoint is required before implementation.

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

Alternatives considered:

- Keep current per-surface icon conventions: rejected due to learnability cost.

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
2. Produce compact Home mockups that include multiple shortcut modules and complete a design sign-off checkpoint.
3. Add quick-win actions and defaults behind current UI-local state models.
4. Add explicit dual-search context and scoping behavior (Drive search vs library search) with clear active-state indicators in both surfaces.
5. Add organization baseline features (tags, filters, lightweight folders) while preserving existing library behavior.
6. Add or update automated tests for view-model and interaction helpers where behavior changes.
7. Run manual regression on rehearsal-critical flows: start playback from playlist row, loop save/preview, queue mode changes, mini-player persistence, and both search contexts.
8. If regressions are found, fall back to existing explicit controls while keeping non-breaking hierarchy improvements.

## Open Questions

- None currently. Decisions for queue actions, reorder interactions, Home composition, search entry points, and organization baseline are resolved in this design.
