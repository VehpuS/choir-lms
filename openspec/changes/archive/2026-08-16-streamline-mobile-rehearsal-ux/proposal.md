## Why

The current mobile rehearsal player already delivers core playback and playlist behavior, but key interactions still feel heavier than a purpose-built music rehearsal app. This next iteration should reduce interaction friction and add high-value quick wins so singers can move faster from discovery to effective part rehearsal.

## What Changes

- Streamline playlist and queue interaction patterns to feel more native on phone-sized touch surfaces.
- Rename Search to Add so the destination communicates Google Drive browse/search/add-to-library work, while reserving Search as an operation available within both Add and Library.
- Clarify information architecture by separating Google Drive discovery search from app-owned library search, including explicit source-scoped search behavior inside their respective surfaces and current-folder-default search in Files with an explicit all-Files option.
- Make search a compact header-level action in Add and Library: keep `Search` immediately to the left of the Drive session menu trigger in Add, preserve a leading `Refresh` action there when the visible Drive context can refresh, keep `Filters` immediately to the left of `Search` in Library, and keep scope obvious through visible root or folder context plus breadcrumbs while browsing.
- Refactor Recents, Add, and Library onto one shared compact destination-header pattern: remove large descriptive top-of-screen headers from the working surfaces and, in Library, replace the prior description text with direct `Files`, `Tracks`, `Loops`, and `Playlists` view buttons.
- Recast both Add (Google Drive) and Library Files around standard mobile file-explorer paradigms: one path-oriented vertical list, pushed folder drill-down, scrollable breadcrumbs, row-level overflow menus, predictable row-body tap behavior by entity type, and touch-friendly chrome modeled after Finder, Windows Explorer, and Google Drive.
- Highlight matched query substrings in search results for both Add (Google Drive) and Library search so users can quickly see why each result matched.
- Support direct preview playback from Google Drive search results without requiring users to save the source first.
- Rename Home to Recents and keep it as an optional acceleration surface for persisted recent rehearsal shortcuts rather than a mandatory workflow step.
- Add low-friction rehearsal productivity actions such as ad-hoc queue actions that can promote single-track playback into a transient queue, stronger resume shortcuts, and smarter defaults in loop and playlist flows.
- Add queue-to-playlist capture actions in Up Next so users can create a new playlist from any active queue session, immediately continue that queue as the newly saved playlist, and then update the currently playing saved playlist after further queue changes.
- Refine the active rehearsal queue view so long queues scroll within a capped visible area, queue rows expose direct play and reorder controls, redundant `Up next`/`Now playing` row text is removed, and next or previous track transport remains available without leaving the queue view.
- Remove the dedicated playlist edit mode so playlist detail rows stay reorder-ready by default with an iOS-style drag handle, inline play or pause control, grouped up/down controls, and overflow-housed `Move to position` / `Remove` actions that mirror Up Next behavior.
- Move create-playlist entry into the Library Playlists section header via a right-aligned `+` trigger that opens a modal for naming the new playlist, instead of keeping playlist creation as a persistent bottom-of-Library component.
- Add Recents row overflow actions (vertical ellipsis) for queue acceleration (`Play next`, `Add to queue`) and a `View in library` handoff so users can jump from recency shortcuts into full library context without extra search steps.
- Standardize saved loop and saved track cards around one shared row-action contract: one inline icon-only `Play` affordance, one shared vertical-ellipsis overflow trigger, and parity for all other applicable actions.
- Keep `Make loop` as the intentional exception on saved tracks only, surfaced from the same overflow menu rather than a dedicated inline button.
- Replace text-labeled `Play` buttons with standard playback icons wherever the action is direct playback entry, including playlist cards, library/search rows, Recents shortcuts, and any remaining shell playback controls that do not need a text label.
- Rework playlist-detail fresh-start playback controls into icon-first ordered and shuffle actions so queue-mode starts remain explicit without rendering a text-labeled `Play ordered` button in playlist detail.
- Add an immediate top-level play affordance on playlist cards while keeping `Open playlist` for detail navigation and moving playlist removal into the shared overflow menu.
- Keep playlist-card rename context-preserving by opening the rename flow in Library instead of routing through playlist detail.
- Keep loops easy to access like regular tracks by preserving the top-level Saved loops section in Library, adding a `View track loops` track-overflow entry that opens a full Library-detail loop view with back navigation when loops exist, and still surfacing loops as their own result category in search, tag, and folder views.
- Keep saved-loop editing available from loop surfaces even during active playback, reusing the loop builder without a forced pause step and resynchronizing any active queue or current-item loop context after save.
- Replace lightweight single-folder metadata with a real file-tree model: folders and file links become tree nodes, while tracks, loops, and playlists remain canonical saved entities that can be referenced from multiple folders through hard links.
- Add a unified Files view for saved library content so tracks, loops, playlists, folders, and future entities can be managed as file-like items inside that tree while preserving dedicated Library views for focused entity browsing.
- Expose hard-link creation through a user-facing `Create a copy` action that opens a move-style destination picker, creates another file link to the same underlying entity, and defaults same-folder copies to a case-insensitively unique `Copy` name.
- Add standard explorer guardrails around case-insensitive naming, duplicate-name prevention, and invalid folder move targets.
- Align file operations with standard explorer semantics: reuse the existing tag editor, playlist selector, and loop builder where applicable; keep rename and move pointer-local; label pointer-level deletion as `Delete from folder`; keep track-level `Remove from library` always available (including during playback and while referenced by folders, playlists, or loops); require explicit impact-aware confirmation before track removal with affected loops, folder links, and playlist entries summarized; provide folder deletion impact summaries; and expose a persistent floating `+` create button modeled after Google Drive for create-folder, add-from-Drive, and create-playlist actions.
- Add explicit Files sort modes (`Name`, `Type`, `Date added`, `Date opened`) and preserve Files path, search scope/query, sort state, and list position when users switch Library views or tabs and return.
- Keep Files sorting and search behavior explorer-consistent: folders stay grouped before playable items across sort modes, search stays scoped to the current folder subtree by default, and broad `All Files` results surface location context.
- Prefer progressive library availability feedback: show one top-level connected/disconnected state first, then surface per-item broken-source recovery actions (`Reconnect` or `Remove from library`) only when connectivity is available.
- Improve consistency and accessibility of icon semantics, touch targets, feedback, and empty-state guidance across playback and library surfaces.
- Formalize a reusable row-action architecture (explicit inline-vs-menu placement, shared overflow trigger, shared menu/dialog shells, and shared interaction style tokens) so consistency improvements can ship safely across multiple commits.

## Capabilities

### New Capabilities

- `mobile-rehearsal-player-usability`: Streamline shell, list, playlist-detail, and queue interactions for faster one-handed rehearsal workflows.
- `mobile-rehearsal-player-quick-wins`: Add small, high-impact rehearsal utilities that reduce taps and improve daily repeat use.
- `mobile-library-organization`: Introduce app-library search, an explorer-style Files view, hard-link-based file organization across saved entities, tags, filters, and track-context loop management.

### Modified Capabilities

- None.

## Impact

- Affected app areas: mobile shell, Recents/Add/Library screens, playlist detail interactions, queue and now-playing surfaces (including queue-to-playlist capture actions), loop-builder naming and feedback flows, Drive search-result preview interactions, saved-library browse/search tooling, and the new Library Files-plus-dedicated-views information architecture.
- Affected code and repo-doc locations: `packages/mobile-rehearsal-player/src/app/routing/shell/*`, `packages/mobile-rehearsal-player/src/app/routing/playback/*`, `packages/mobile-rehearsal-player/src/app/screens/*`, `packages/mobile-rehearsal-player/src/app/library/drive/*`, `packages/mobile-rehearsal-player/src/app/library/playlists/*`, `packages/mobile-rehearsal-player/src/app/library/components/saved-rehearsal-library-section/*`, `packages/mobile-rehearsal-player/src/app/library/saved-rehearsal-library/*`, `packages/mobile-rehearsal-player/src/app/library/storage/*`, and repo guidance or skill docs that currently describe the middle destination as Search.
- Platform and design constraints: maintain waveform-first playback, persistent mini-player, existing playback engine semantics, platform-familiar music iconography, and standard OS-level file explorer paradigms adapted for touch/mobile use while making source-vs-library search context explicit.
- Risk profile: medium; the change now includes an intentional UI refactor of both Add and Files plus a library-organization model shift away from single-folder entity metadata toward file nodes and hard links, in addition to the existing queue and playlist interaction work.
