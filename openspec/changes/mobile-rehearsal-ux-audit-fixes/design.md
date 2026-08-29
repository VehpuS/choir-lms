## Context

This change follows a live UI/UX audit of `packages/mobile-rehearsal-player` conducted with the repo's `design-audit`, `laws-of-ux`, `apple-hig-ios`, `music-ui-iconography`, and `ui-consistency` skills, cross-referenced against Spotify, Apple Music, YouTube Music, and Deezer support docs, and confirmed by manually driving the running web build: searching and saving Drive tracks, cutting a loop, creating two playlists and adding items, creating a folder, tagging an item, building a queue, scrubbing/jumping on the waveform, and reviewing Recents.

The audit's headline result is not that the app's design is weak — most surfaces (search scoping + match highlighting, loop range selector, overflow-menu ordering, queue terminology) already match or exceed the mainstream apps researched. The problem is that a handful of **already-specified** requirements from `mobile-library-organization`, `recents-tag-navigation`, and `mobile-rehearsal-player-usability` are not actually working in the running app, plus a small number of real gaps the existing specs don't cover precisely enough yet.

Follow `design-audit`'s scope-discipline by default: touch layout, spacing, icon/label treatment, and the specific UI-state bugs identified below; do not touch playback/queue domain logic, Drive auth, or persisted data shapes, except for the tag-save write path itself, which is the one confirmed functional regression in scope.

## Goals / Non-Goals

**Goals:**

- Restore the app to conformance with requirements the specs already promise: tag persistence, tag-editor suggestions, playlist shuffle-play.
- Close the specific icon-semantics and layout gaps the audit found that the specs didn't yet cover precisely enough to catch (repeat/shuffle glyph collision, FAB/row overlap, drag-handle inconsistency, save-acknowledgment inconsistency).
- Tighten the shared Library-shell layout so short lists stop reserving large empty vertical space, favoring a denser view that can show more content over filling the gap with decorative or guidance content.

**Non-Goals:**

- No rewrite of playback, queue, or persistence architecture.
- No new library/dependency.
- No IA changes (tab structure, navigation model) — this is a bug-fix and polish pass on the existing, already-designed IA from `streamline-mobile-rehearsal-ux`.
- No native-iOS volume-control rewrite unless the verification task in Phase 3 actually finds the native build uses the same custom slider as web.

## Decisions

### Phase 0 — Bugs (fix first; these silently break shipped requirements)

#### 0.1 Tag persistence

A background code trace (general-purpose agent, read-only) traced the save path and found the likely defect location, though not yet the exact line:

- Call chain: `tag-editor-sheet/index.tsx` (Save button) → `saved-rehearsal-library-section/tag-editor-sheet.tsx` → `use-saved-rehearsal-library-tag-editor.ts` (`saveTagEdits`) → `use-saved-rehearsal-library.ts` (`saveSource` / `persistSource`) → `audio-library-runtime`'s `async-storage-practice-repository.ts` (`saveSource`) → `saved-rehearsal-library/view-model.ts` (`resolveSavedRehearsalLibrarySources`) for display merge.
- The two historically bug-prone spots in that chain are both currently correct and covered by tests: the view-model merge (fixed for a similar "drops locally-owned tags" bug in commit `a7239c4`, with a passing regression test) and the repository's tag round-trip (`audio-library-runtime`'s `rehearsal-playback.spec.ts`, "stamps, preserves, and drops tagAddedAt entries on saveSource").
- The gap: nothing tests the **stateful** save-and-reflect path. `use-saved-rehearsal-library-tag-editor.spec.ts` only tests the pure `resolveTagEditorTagsAndTitle` helper, never `saveTagEdits` itself. `use-saved-rehearsal-library.spec.ts` only tests two pure exported helpers, never the `saveSource`/`persistSource` hook logic that actually calls the repository and updates React state. This untested glue layer — common to tracks, loops, and playlists alike, matching the audit's reproduction across all three — is the primary suspect.
- A related, separately-confirmed staleness bug: `use-library-files.ts`'s `canonicalIdsKey` is built only from entity IDs, so the Files-tree `refresh()` effect never re-fires on a tags-only change. This doesn't explain the Tracks-tab symptom on its own (that view reads `savedLibrarySources` independently) but will cause the same "tag doesn't show up" symptom inside the Files view specifically, and should be fixed alongside the main bug since it's the same class of staleness.

Implementation should start by adding the missing stateful test coverage (save tags → assert persisted state → assert re-read reflects it) for `saveTagEdits` and `saveSource`/`persistSource`, since that's the fastest way to pin the exact defect and prevent the same class of regression again.

#### 0.2 Floating "+" / last-row overlap

The Files-view (and other Library views') floating create button sits at a fixed screen position that can overlap the current folder's last visible row when the list is short. Two fixes, likely both needed:

- Reserve bottom scroll-content padding equal to the FAB's footprint plus safe margin, so no row ever renders directly underneath it (matches the existing spec language that the control "stays above the tab bar and mini-player safe area rather than obscuring them" — extend that same treatment to the last row).
- Audit the FAB's and the last row's hit-testing/z-index so a tap is never ambiguous between the two controls, regardless of exact pixel position.

#### 0.3 Stale success banners

"Loop saved" and similar cards persist indefinitely (correctly, per `apple-hig-ios`'s explicit-dismiss-only guidance for accessibility) but aren't scoped to the action that produced them, so returning to a screen later resurfaces an old confirmation as if it just happened. Scope acknowledgment state to the save action/session that produced it (e.g. keyed to the saved entity id + a monotonic action token) rather than a bare boolean, so a stale banner never resurfaces, while a dismissed banner also never reappears on remount.

### Phase 1 — Hierarchy & discoverability

#### 1.1 Repeat/shuffle icon collision

Confirmed via the accessibility tree, not just visual impression: the "Repeat off" radio option renders the same crossed-arrows glyph as the separate, adjacent "Enable shuffle playback" button. Per `music-ui-iconography`'s semantic mapping (shuffle = crossing arrows; repeat = loop icon), give every repeat state — off, one, all — a dedicated repeat-family glyph, and reserve the crossing-arrows glyph exclusively for the shuffle control.

**Resolved implementation (superseding the 3-segment framing above):** MaterialCommunityIcons' repeat family has only 4 members (`repeat`, `repeat-off`, `repeat-once`, `repeat-variant`) — `repeat-off`'s diagonal strike collides with shuffle, and no other combination of 3 gives full pairwise visual distinctness within a 3-segment control (confirmed live: `repeat-variant` vs `repeat` still read as the same loop shape at a glance). Per user direction, converged instead on the single-cycling-button pattern used by Spotify, YouTube Music, and Apple Music: one button cycles off→one→all→off (or off→one→off when only those two are visible), sharing the plain `repeat` glyph for off/all and distinguishing them purely through the button's existing selected/unselected styling, while "one" keeps its own dedicated `repeat-once` glyph. This also fits the existing `mobile-rehearsal-player-ui` spec wording more directly ("each control's active/selected state is conveyed through styling ... on that control's own dedicated glyph") than 3 simultaneously-visible segments did.

#### 1.2 Playlist shuffle-play

`mobile-rehearsal-player-usability` already requires playlist detail to expose "icon-first ordered and shuffle actions" as a control row. The running app only offers ordered play, and that single control lives in the shared top app-bar (swapped in for the Filters icon) rather than inside playlist detail. Fix: add the missing shuffle-start action, and move both ordered/shuffle controls into a control row inside playlist detail itself, matching the existing spec's control-row description rather than continuing to overload the shared header.

#### 1.3 Library view whitespace

Files, Tracks, Loops, Playlists, and Tags all end in a large empty gap below short content before the floating "+"/mini-player. This reads as a shared layout characteristic of the Library shell rather than a per-screen issue.

Resolved direction: tighten the layout rather than fill the gap with content. The Library shell should size its content area to what the current list actually needs instead of reserving full remaining viewport height, so the list stops padding itself with empty space and — just as importantly — so a longer list has more room to show additional rows before scrolling is needed. Do not introduce contextual next-action guidance or other filler content as a substitute; that treats the symptom (empty-looking screen) rather than the cause (layout reserves more space than the content uses). Find and fix the specific layout rule in the shared Library-shell/view-switcher container causing the reservation (e.g. a `flex: 1` or fixed-height wrapper around the active view's content) rather than patching each of the five views independently.

### Phase 2 — Refinement

#### 2.1 Save acknowledgment consistency

Saving a loop shows a persistent "Loop saved" card; saving a track from Add silently swaps the row's `Save` button for a management icon with no confirmation text. Give Add's save action the same acknowledgment-card treatment as loop save (new spec requirement in `mobile-rehearsal-player-usability`), reusing the same scoping fix from 0.3 so it doesn't go stale either.

#### 2.2 Tag-editor suggestions

`recents-tag-navigation` already fully specifies a suggestion row (popular tags when empty, matching tags while typing, comma-aware for multi-tag input) that never renders in the running app. This is a pure conformance bug against an unchanged spec — implement against the existing requirement text, no spec delta needed.

#### 2.3 Drag-handle consistency

Playlist-detail reorder rows use a leading-edge dot-grid handle; Up Next/queue reorder rows use a different grid icon positioned mid-trailing. Converge on one icon and one edge placement for both, per the new cross-surface scenario added to `mobile-rehearsal-player-ui`.

#### 2.4 Library tab-pill scroll affordance

The Files/Tracks/Loops/Playlists/Tags pill row scrolls horizontally to reveal "Tags" with no visual hint that it's scrollable. Add a fade edge or equivalent minimal affordance. Implementation detail only — no spec delta.

### Phase 3 — Native verification

#### 3.1 iOS volume control

`apple-hig-ios` requires `MPVolumeView` (or the RN equivalent) rather than a plain slider for system volume on iOS. The web build's custom 0–100% slider is a reasonable web fallback since `MPVolumeView` has no web equivalent. Verify whether the native iOS build shares that same custom slider component or already has a native volume view; swap to the native control only if the native build is currently sharing the web fallback.

## Risks / Trade-offs

- [Root cause of the tag-save bug is not yet pinned to an exact line] → Start implementation by adding the missing stateful tests identified in 0.1; they will surface the exact defect before a fix is written blind.
- [Fixing the FAB overlap by adding bottom padding could shift existing scroll positions/tests that assume current list geometry] → Check existing Library scroll-position/list-layout tests before landing 0.2.
- [Moving the playlist Play control out of the shared header could affect other header-layout assumptions/tests shared across Recents/Add/Library] → Confirm the header's play-icon slot isn't referenced elsewhere before removing it in 1.2.
- [Scoping acknowledgment banners to an action token (0.3) touches the same state Add's new acknowledgment card in 2.1 will use] → Land 0.3 before 2.1 so 2.1 can reuse the fixed scoping mechanism instead of duplicating it.

## Migration Plan

1. Phase 0 bugs first (tag persistence, FAB overlap, stale banners) — these are regressions against shipped behavior and unblock the rest.
2. Phase 1 (icon collision, playlist shuffle-play, whitespace tightening) — visible hierarchy fixes.
3. Phase 2 (save-acknowledgment reuse, tag suggestions, drag-handle convergence, scroll affordance) — refinement, can land independently and in any order.
4. Phase 3 (native volume verification) — investigation task, may close with no code change if the native build already differs from web.
5. Run the narrowest relevant Nx test path for each touched surface before finishing each slice, per the repo's testing policy; add the missing stateful tests identified in 0.1 as part of that slice specifically.

## Open Questions

- Whether the tag-persistence defect is in `saveTagEdits`, `saveSource`/`persistSource`, or a stale-closure interaction between them — to be resolved by the stateful tests added in 0.1, not guessed here.
