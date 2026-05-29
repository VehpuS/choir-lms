## 1. IA Foundation and Non-Regression Guardrails

- [x] 1.1 Document the current top-level IA (Home/Search/Library baseline with Home -> Recents rename intent) and map every existing user-visible feature to a destination or entry point before reordering work begins.
- [x] 1.2 Define the next IA arrangement for top-level tabs and within-tab section order, including explicit placement for Google Drive browse/navigation, Drive search, and app-library search.
- [x] 1.3 Add non-regression acceptance criteria for critical existing capabilities (Drive root switching, folder navigation, breadcrumbs, source save/remove, track playback, loop creation, playlist playback).
- [x] 1.4 Add UI-level context labels and helper copy rules that prevent Drive features from being hidden or mislabeled after IA changes.
- [x] 1.5 Validate proposed IA against representative flows (discover in Drive -> save -> add to playlist -> play) and refine before component implementation.
- [x] 1.6 Build compact Recents mockups that include multiple shortcut modules (for example recents and popular tags) and capture design confirmation before implementation.

## 2. Playlist and Queue Interaction Streamlining

- [x] 2.1 Refine playlist detail hierarchy so playback actions stay primary and non-critical management actions move to lighter affordances.
- [ ] 2.2 Implement low-friction playlist item removal interaction in default playlist detail mode while preserving undo snackbar recovery.
- [ ] 2.3 Implement dual reorder support in playlist edit mode: drag-and-drop plus explicit icon-based move controls, with destructive actions visually distinct from playback actions.
- [ ] 2.4 Add `Play next` queue quick-action support for saved track and loop rows without interrupting active playback.
- [ ] 2.5 Add `Add to Up Next` queue quick-action support for saved track and loop rows without interrupting active playback.
- [ ] 2.6 Update queue and now-playing control presentation so mode-aware controls remain explicit and queue-only controls stay hidden in standalone playback.

## 3. Top-Level Tab Reordering and Search Contexts

- [ ] 3.1 Reorder top-level tab composition and within-tab sections according to the IA plan while preserving current feature coverage.
- [ ] 3.2 Rebalance Recents hierarchy so Recents stays optional and non-blocking while still supporting recents and shortcut use cases.
- [ ] 3.3 Add recent rehearsal entry points on Recents with concise fallback guidance for first-use or empty-history states, and optional shortcut metadata (for example popular tags).
- [ ] 3.4 Implement explicit dual search contexts: Google Drive discovery search (including folder scoping) and dedicated app-library search.
- [ ] 3.5 Add clear active-context and scope indicators so users always know which corpus (Drive vs library) is being searched.
- [ ] 3.6 Ensure search entry points are first-class in both the Google Drive navigation surface and the app-library surface.
- [ ] 3.7 Add recent-search suggestion interactions for the active search context that allow tap-to-run query execution.
- [ ] 3.8 Verify Google Drive navigation remains first-class after tab/section reorder: root selector, folder drill-down, breadcrumbs, and unavailable/source status visibility.

## 4. Loop and Action Defaults

- [ ] 4.1 Add context-aware default loop naming in loop creation while preserving user override behavior before save.
- [ ] 4.2 Align row-level action menus to include new queue-acceleration actions and maintain consistent icon semantics across Library and Search.
- [ ] 4.3 Ensure loop management remains parent-track-first while supporting optional promotion of loops to first-class organization surfaces.
- [ ] 4.4 Add track-context loop management entry points (create, view, edit, remove) and preserve visible parent-track linkage in all loop surfaces.
- [ ] 4.5 Audit and update icon-only control labels, selected/disabled states, and touch-target sizing across shell, playback, queue, and row-action surfaces.

## 5. Library Organization (Tags, Filters, Optional Folders)

- [ ] 5.1 Add dedicated app-library search behavior over saved entities (tracks, loops, playlists, folders, tags) independent of Drive discovery search.
- [ ] 5.2 Add tag assignment and tag-filter interactions for app-owned library entities without changing playback semantics.
- [ ] 5.3 Add lightweight folder organization flows for library entities, including loops, as part of the first organization baseline.
- [ ] 5.4 Preserve and display parent-track provenance when loops are shown as first-class results in search, tags, or folders.

## 6. Validation and Regression Safety

- [ ] 6.1 Add or update focused automated coverage for new view-model or helper behavior introduced by queue quick actions, dual search contexts, library organization, loop default naming, and tab/section reordering.
- [ ] 6.2 Run manual regression for rehearsal-critical flows: playlist row-start playback, undoable removal, queue-mode transitions, loop save/preview, mini-player persistence, Drive search scoping, app-library search/filter behavior, and Drive navigation continuity.
- [ ] 6.3 Explicitly verify no existing critical feature was lost during IA reorder using the baseline mapping from 1.1 and record pass/fail per feature.
- [ ] 6.4 Compare final Recents, Search, Library, playlist detail, now-playing, and queue surfaces against this change's specs and capture any intentional deltas before completing implementation.
