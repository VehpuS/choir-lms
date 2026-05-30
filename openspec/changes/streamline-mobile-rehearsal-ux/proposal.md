## Why

The current mobile rehearsal player already delivers core playback and playlist behavior, but key interactions still feel heavier than a purpose-built music rehearsal app. This next iteration should reduce interaction friction and add high-value quick wins so singers can move faster from discovery to effective part rehearsal.

## What Changes

- Streamline playlist and queue interaction patterns to feel more native on phone-sized touch surfaces.
- Clarify information architecture by separating Google Drive discovery search from app-owned library search, including explicit source-scoped search behavior.
- Rename the current Home tab to Recents and keep it as an optional acceleration surface for recent rehearsal shortcuts rather than a mandatory workflow step.
- Add low-friction rehearsal productivity actions such as ad-hoc queue actions, stronger resume shortcuts, and smarter defaults in loop and playlist flows.
- Standardize saved loop card actions with saved track card actions for playlist-add flows so both surfaces use consistent placement and language.
- Add an immediate top-level `Play` action on playlist cards while keeping `Open playlist` for detail navigation.
- Make loops track-context-first (managed from their parent tracks) while allowing optional promotion to first-class library objects in user-managed folders.
- Add practical organization tools for saved library content: filters, tags, and optional folders.
- Improve consistency and accessibility of icon semantics, touch targets, feedback, and empty-state guidance across playback and library surfaces.
- Formalize a reusable row-action architecture (explicit inline-vs-menu placement, shared overflow trigger, shared menu/dialog shells, and shared interaction style tokens) so consistency improvements can ship safely across multiple commits.

## Capabilities

### New Capabilities

- `mobile-rehearsal-player-usability`: Streamline shell, list, playlist-detail, and queue interactions for faster one-handed rehearsal workflows.
- `mobile-rehearsal-player-quick-wins`: Add small, high-impact rehearsal utilities that reduce taps and improve daily repeat use.
- `mobile-library-organization`: Introduce app-library search, tags, filters, and optional folder organization with track-context loop management.

### Modified Capabilities

- None.

## Impact

- Affected app areas: mobile shell, Recents/Search/Library screens, playlist detail interactions, queue and now-playing surfaces, loop-builder naming and feedback flows, and saved-library browse/search tooling.
- Affected code locations: `packages/mobile-rehearsal-player/src/app/routing/*`, `packages/mobile-rehearsal-player/src/app/screens/*`, and `packages/mobile-rehearsal-player/src/app/library/components/*`.
- Platform and design constraints: maintain waveform-first playback, persistent mini-player, existing playback engine semantics, and platform-familiar music iconography while making source-vs-library search context explicit.
- Risk profile: low-to-medium; primarily UI and interaction changes with limited domain-model impact if queue quick actions are kept additive.
