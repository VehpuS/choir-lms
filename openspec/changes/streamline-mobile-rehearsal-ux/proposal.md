## Why

The current mobile rehearsal player already delivers core playback and playlist behavior, but key interactions still feel heavier than a purpose-built music rehearsal app. This next iteration should reduce interaction friction and add high-value quick wins so singers can move faster from discovery to effective part rehearsal.

## What Changes

- Streamline playlist and queue interaction patterns to feel more native on phone-sized touch surfaces.
- Rename the current Search tab to Add so the destination communicates Google Drive browse/search/add-to-library work, while reserving Search as an operation available within both Add and Library.
- Clarify information architecture by separating Google Drive discovery search from app-owned library search, including explicit source-scoped search behavior inside their respective surfaces.
- Highlight matched query substrings in search results for both Add (Google Drive) and Library search so users can quickly see why each result matched.
- Support direct preview playback from Google Drive search results without requiring users to save the source first.
- Rename the current Home tab to Recents and keep it as an optional acceleration surface for persisted recent rehearsal shortcuts rather than a mandatory workflow step.
- Add low-friction rehearsal productivity actions such as ad-hoc queue actions that can promote single-track playback into a transient queue, stronger resume shortcuts, and smarter defaults in loop and playlist flows.
- Add queue-view playlist capture actions so users can save a transient Up Next queue as a new playlist or update an existing playlist with currently enqueued items from Now Playing.
- Add Recents row overflow actions (vertical ellipsis) for queue acceleration (`Play next`, `Add to queue`) and a `View in library` handoff so users can jump from recency shortcuts into full library context without extra search steps.
- Standardize saved loop and saved track cards around one shared row-action contract: one inline icon-only `Play` affordance, one shared vertical-ellipsis overflow trigger, and parity for all other applicable actions.
- Keep `Make loop` as the intentional exception on saved tracks only, surfaced from the same overflow menu rather than a dedicated inline button.
- Replace text-labeled `Play` buttons with standard playback icons wherever the action is direct playback entry, including playlist cards, library/search rows, Recents shortcuts, and any remaining shell playback controls that do not need a text label.
- Add an immediate top-level play affordance on playlist cards while keeping `Open playlist` for detail navigation and moving playlist removal into the shared overflow menu.
- Keep playlist-card rename context-preserving by opening the rename flow in Library instead of routing through playlist detail.
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

- Affected app areas: mobile shell, Recents/Add/Library screens, playlist detail interactions, queue and now-playing surfaces (including queue-to-playlist capture actions), loop-builder naming and feedback flows, Drive search-result preview interactions, and saved-library browse/search tooling.
- Affected code and repo-doc locations: `packages/mobile-rehearsal-player/src/app/routing/*`, `packages/mobile-rehearsal-player/src/app/screens/*`, `packages/mobile-rehearsal-player/src/app/library/components/*`, and repo guidance or skill docs that currently describe the middle destination as Search.
- Platform and design constraints: maintain waveform-first playback, persistent mini-player, existing playback engine semantics, and platform-familiar music iconography while making source-vs-library search context explicit.
- Risk profile: low-to-medium; primarily UI and interaction changes with modest playback-state impact because queue quick actions now need to create and surface transient queues in addition to persisted playlist sessions, plus queue-view actions that persist queued items into playlists.
