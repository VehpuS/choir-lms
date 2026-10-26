## Scope

This change builds the offline cache and its UI on web. Native storage, `react-native-track-player` playing local files, and the on-device checks are tracked in `native-playback-follow-ups` (tasks 1.10 and 1.11, moved 2026-10-27 at the user's direction). The `AudioStore` interface keeps the cache logic platform-neutral so native only adds a store.

## Context

Web playback fetches the whole Drive `alt=media` response into a blob on every `add()`/`load()` (`saved-track-web-download.ts`) and revokes it on `reset()`/`stop()` (`saved-track-player-web-load.ts`). Nothing is reused: loop previews, track and loop starts of one file, and reloads each repeat a 3-8 MB download. Native uses `react-native-track-player` with the Drive URL and auth headers, so every start streams again. Waveform peaks already have a Drive-version-keyed, size-budgeted LRU (`waveform-peaks/peak-cache.ts`) over a platform store (`peak-store.web.ts` on IndexedDB, `peak-store.ts` on AsyncStorage); that is the pattern to follow for audio.

## Decisions (user, 2026-10-26)

- **Offline model: both.** An automatic LRU holds recently played audio within a budget; a `Keep offline` action pins a file so eviction skips it.
- **Sign-out: ask.** Signing out of Drive asks whether to keep or clear offline copies. Clearing removes every cached audio and score file; keeping leaves them playable without a session.

## Confirmed (user, 2026-10-27)

- **Key, invalidation and quota policy** below (Key and invalidation, and the quota sentence of Budget) are confirmed as written.
- **Cache size presets: 100 MB, 250 MB, 500 MB, 1 GB, 2 GB; the web default becomes 250 MB** (a selectable preset; the 200 MB constant from 1.1 changes to 250 MB when 1.6 adds the setting).
- **Settings layout: a top-level list of category rows, each opening its own page** (task 1.8).
- Still to explore with the user when built: the per-file offline state UI and menu placement (1.5, 1.6), and the offline files view layout (1.6).

## Proposed (confirm with the user before implementing)

- **Key and invalidation.** Entry key is `driveFileId`; the entry stores `modifiedTime` as its version (`resolveWaveformSourceVersion` is reused so audio and peaks agree). A lookup whose current `modifiedTime` differs drops the entry. Offline (no Drive metadata) an entry is served as-is and marked possibly stale.
- **Layers.** A platform-neutral `audio-cache` (LRU, pin set, budget, in-flight map) over a `store` interface, as `peak-cache` does:
  - Web: in-memory blob map for the session (instant replays) backed by IndexedDB or Cache Storage for reloads. Blob URLs stay per-player-hold; `reset()` releases the hold, never revokes a cached blob's bytes.
  - Native (built in `native-playback-follow-ups` 1.10): files under the app's document directory via `expo-file-system` (a new direct dependency; present transitively in the lockfile), with an index in AsyncStorage. File system, not AsyncStorage, for bytes. Whether `react-native-track-player` plays a `file://` URL with the same transport and lock-screen behavior is that task's spike.
- **Shared in-flight download.** One download per `driveFileId` + version. Each waiter holds a reference; `abortSavedTrackDownloads()` cancels only when the last waiter leaves (8.33: a superseded request must not cancel a download another waiter still needs).
- **User-set cache size (user, 2026-10-26).** The budget is a per-device user setting, not only a constant: a `Cache size` control with preset steps (proposed 100 MB, 250 MB, 500 MB, 1 GB, 2 GB; defaults below) at the top of the offline files view and in Settings. Lowering it evicts least recently used unkept files immediately; if kept files alone exceed it they stay and the view says so. It covers the audio budget only (waveform peaks keep their own 64 MB; score files stay outside it). Presets and placement need a check with the user (task 1.6).
- **Settings screen layout (user, 2026-10-26).** Settings already stacks Piano, My parts, two Search sources sections and more in one long scroll, and this change adds Offline storage. The change restructures it with a standard pattern: the likely choice is a top-level list of category rows (for example Piano, My parts, Search sources, Offline storage) each opening its own page, as iOS Settings does, rather than collapsible sections in one scroll. Options to compare with the user before building: nested pages, collapsible sections, or a segmented/tabbed layout (task 1.8).
- **Budget.** Default 500 MB automatic cache on native and 200 MB on web, configurable constants; pinned files count toward usage but are not auto-evicted. If pinned files alone exceed the budget the user is told rather than silently evicting. Quota errors on web evict the oldest unpinned entries, then fall back to the in-memory copy.
- **Waveform.** Peak extraction reads the cache entry (`emitSavedTrackDownloaded` becomes a cache hit/fill) and the loop builder and library can request analysis of a cached file that was never played (1.2). A background pass over uncached files is out of scope unless the user asks.
- **UI.** A per-file offline state (not offline / downloading / available offline / pinned) and a `Keep offline` / `Remove from offline` action in the file and track menus.
- **Offline files view (user, 2026-10-26).** A dedicated view opened from the user-icon session menu (`drive-session-menu`, beside `Settings` and `Forget session`) lists every offline file for browsing and purging. It reuses the library's file rows and the multi-selection flow (select, then `Remove from offline`) rather than a new list design, and shows: the total used against the budget at the top (for example `212 MB of 500 MB`), a size on every row, a kept/automatic badge, and the score files of a track as part of its row or as sub-rows. Actions: remove one file, remove a selection, `Clear automatic cache`, `Clear all`. Sizes use one formatter everywhere (binary units, one decimal under 10, `KB`/`MB`/`GB`, never a bare byte count), shared with the download progress label, and the list can sort by size so the largest files are easy to purge. The empty state explains how files become available offline. Exact layout and which rows/selection components are reused need a quick check with the user before building (task 1.6).
- **Sheet music.** Score files (Drive PDF, MusicXML, MIDI) are small, so they use the same store under a `score` kind and follow the audio pin state of their track (`Keep offline` on a track keeps its scores); they are exempt from the audio LRU budget but counted in usage and cleared on sign-out. Linked pages (MuseScore etc.) cannot be cached; the source switcher says `Needs a connection`.

## Risks

- IndexedDB/Cache Storage quota varies by browser and can evict without notice, so the offline state must be re-verified on open, not trusted from the index.
- Private Drive content persisting on device is a privacy surface: sign-out must be handled before shipping any persistent store.
- `modifiedTime` can change without audio change (metadata edits), which costs a re-download but never serves wrong audio.

## Order of work

1. Web replay cache with shared in-flight (1.1 a-c, e), in-memory first, persistence behind the store interface.
2. Offline model and UI decisions (1.3), then the Settings restructure (1.8).
3. Sign-out prompt, offline files view, then sheet music (1.5) and never-played waveforms (1.2) on web. Native follows in `native-playback-follow-ups`.
