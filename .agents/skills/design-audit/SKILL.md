---
name: design-audit
description: >
  UI and UX design audit for the mobile rehearsal player in this repo. Use when
  tasks mention auditing the design, improving visual hierarchy, simplifying the
  interface, polishing Recents, Add, Library, the mini-player, playback sheet,
  or playlist and loop flows, or when the app should feel more native and
  intentional without changing core behavior.
---

# Design Audit for Choir LMS Mobile

Be exacting about hierarchy, spacing, typography, color, motion, and surface
discipline. Preserve the product behavior unless the user explicitly approves a
behavior change.

The primary audit surface is `packages/mobile-rehearsal-player`.

## Startup: Smart Project Discovery

Before forming an opinion, discover and internalize the current design context.
Search in three tiers and stop when you have enough.

### Tier 1: Exact File Search

Read these first when they exist and are relevant:

- `README.md`
- `AGENTS.md`
- `packages/mobile-rehearsal-player/src/app/utils/theme.ts`
- `packages/mobile-rehearsal-player/src/app/routing/shell/mobile-shell-styles.ts`
- `packages/mobile-rehearsal-player/src/app/routing/shell/mobile-shell/index.tsx`
- `packages/mobile-rehearsal-player/src/app/screens/recents/index.tsx`
- `packages/mobile-rehearsal-player/src/app/screens/add/index.tsx`
- `packages/mobile-rehearsal-player/src/app/screens/library/index.tsx`
- `packages/mobile-rehearsal-player/src/app/screens/recents/screen-copy.ts`
- `packages/mobile-rehearsal-player/src/app/screens/add/screen-copy.ts`
- `packages/mobile-rehearsal-player/src/app/screens/library/screen-copy.ts`
- `packages/mobile-rehearsal-player/src/app/components/summary-card.tsx`
- `packages/mobile-rehearsal-player/src/app/routing/playback/playback-surface-content.tsx`
- `packages/mobile-rehearsal-player/src/app/library/loops/components/loop-range-selector-surface/index.tsx`
- `packages/mobile-rehearsal-player/src/app/library/playlists/components/saved-track-playlist-menu-surface.tsx`
- `openspec/changes/streamline-mobile-rehearsal-ux/design.md`

### Tier 2: Pattern Fallback

If Tier 1 is incomplete, search for these patterns:

- `packages/mobile-rehearsal-player/src/app/**/*theme*`
- `packages/mobile-rehearsal-player/src/app/**/*styles*`
- `packages/mobile-rehearsal-player/src/app/screens/**/index.tsx`
- `packages/mobile-rehearsal-player/src/app/**/*surface*`
- `packages/mobile-rehearsal-player/src/app/**/*card*`
- `packages/mobile-rehearsal-player/src/app/**/*panel*`
- `CLAUDE.md`
- the existing skills `apple-hig-ios` and `music-ui-iconography`

### Tier 3: Live App Walkthrough

If the app is running, inspect at least these states:

- Recents with no active mini-player
- Recents with an active mini-player
- Add empty and populated
- Library with saved tracks and loops
- Now Playing sheet
- Queue sheet
- Loop builder
- Playlist action menu and playlist detail

Capture first-impression issues, navigation clarity, density, rhythm, and
whether the app feels like one system.

After discovery, summarize what you found and what context is still missing
before presenting recommendations.

## Audit Protocol

### Step 1: Full Audit

Review each screen or surface against the 15 audit dimensions.

Recommended audit units for this repo:

- shared shell
- Recents
- Add
- Library
- Now Playing
- Queue
- Loop builder
- Playlist menu and playlist detail

Load `references/audit-dimensions.md` for the scoring criteria.

### Step 2: Apply the Jobs Filter

For every finding, decide whether the element should be removed, simplified, or
elevated.

Load `references/jobs-filter.md` for the checklist.

### Step 3: Compile a Phased Plan

Organize findings into:

- Phase 1: critical hierarchy, usability, consistency, or responsiveness issues
- Phase 2: refinement of spacing, typography, color, alignment, and iconography
- Phase 3: polish in motion, empty states, loading states, and modal presentation
- design-system updates: shared tokens, shell rules, component variants, or deprecated patterns
- implementation notes: exact file, exact component, exact property, and old value to new value when practical

Load `references/design-rules.md` while writing the plan.

### Step 4: Wait for Approval

Do not implement broad visual changes without presenting the phased plan first.
If the user asked for implementation immediately, still present a compact audit
summary and keep the first implementation pass to the approved phase or the
explicitly requested screen.

## Scope Discipline

Keep the work visual unless the user clearly asks for behavior changes.

Touch:

- layout, spacing, typography, color, and component styling
- motion and presentation polish
- accessibility improvements tied to the UI surface
- copy changes that clarify the interface without changing the product flow

Do not touch by default:

- playback queue logic
- Google Drive auth flow
- saved library data behavior
- playlist persistence logic
- runtime integrations
- domain models or package APIs

Load `references/scope-discipline.md` for examples and the decision tree.

## After Implementation

After each approved phase:

1. Run focused validation for the touched surface.
2. Summarize the before and after effect in screen-level terms.
3. Record durable design lessons in `memories/repo/mobile-playback.md` when the change reveals a reusable rule or pitfall.
4. Update `README.md` only if the change alters repo structure, workflow expectations, or the documented product direction.
5. Flag remaining unapproved phases instead of rolling straight into them.

Load `references/post-implementation.md` for the full closeout protocol.

## Reference Loading Strategy

Load references on demand:

| Step                      | Load                                |
| ------------------------- | ----------------------------------- |
| Starting audit            | `references/audit-dimensions.md`    |
| Filtering findings        | `references/jobs-filter.md`         |
| Writing the plan          | `references/design-rules.md`        |
| Handling gray areas       | `references/scope-discipline.md`    |
| Closing an approved phase | `references/post-implementation.md` |

When the audit includes iOS pattern choices or playback icons, also consult the
existing skills:

- `apple-hig-ios`
- `music-ui-iconography`
