## Context

This repository is a greenfield Nx monorepo intended to support a broader choir learning platform over time, but the first product slice is intentionally narrower: a mobile rehearsal player for online audio practice. The MVP centers on Google Drive as the initial media source, a saved app-owned rehearsal library of Drive references, app-defined loops and playlists as the core rehearsal structures, and a mobile playback experience that feels dependable enough for repeated daily use.

The main constraint is that media behavior matters more than broad platform coverage in this slice. The product needs stable mobile playback, background audio, and native transport integration without taking on the complexity of offline sync, collaborative editing, or advanced recording workflows.

## Goals / Non-Goals

**Goals:**

- Deliver a mobile-first React application with dependable playback of saved Google Drive audio references.
- Support browsing and searching across personal and shared Drive folders so users can discover candidate rehearsal tracks before saving them.
- Model saved full tracks and named loops as first-class playable items that can be queued together in playlists.
- Support playlist playback modes needed for rehearsal practice: ordered playback, repeat, and shuffle.
- Establish a music-app-inspired mobile UI shell that makes discovery, saved collections, playlists, and active playback feel cohesive on a phone.
- Preserve native mobile playback affordances where practical for MVP, including background playback and lock-screen transport controls.
- Keep domain and package boundaries clean enough to support future choir LMS applications in the same Nx workspace.

**Non-Goals:**

- Offline downloads, sync, or conflict resolution.
- Automatically mirroring all accessible Google Drive audio into the rehearsal library without explicit user selection.
- Rich collaboration features such as shared editing, comments, or real-time playlist co-authoring.
- Non-audio materials such as PDF scores, lyrics, schedules, or video playback.
- Multi-stem mixing, member recording capture, composite performance generation, or other DAW-like behavior.
- A full web companion or admin surface in the first slice.

## Decisions

### 1. Build the first client as an Expo-based mobile application

The MVP prioritizes dependable mobile playback over zero-install distribution. Expo provides a more credible path to background audio, native media controls, and mobile transport integration than a PWA-first approach.

Alternatives considered:

- PWA-first: rejected for MVP because mobile browser media constraints would put core rehearsal behavior at risk.
- Dual app and web launch: rejected because it broadens scope before the core practice loop is validated.

### 2. Treat Google Drive as the discovery and media source, but keep the saved rehearsal library as app-owned data

Audio files remain in Google Drive. The application lets the user browse and search accessible Drive content, then stores explicit references to selected files plus app-defined entities such as loops, playlists, and queue state. This keeps the MVP focused on rehearsal behavior rather than attempting to encode product semantics back into Drive.

Alternatives considered:

- Mirror or ingest audio into app-managed storage: rejected for MVP because it adds media hosting and sync complexity too early.
- Store loops and playlists only on-device: rejected because app-owned persistence is a better foundation for future cross-device and choir-scoped use.

### 3. Separate Drive discovery from the saved rehearsal library

The mobile app should expose a Drive browser and search surface for accessible My Drive and shared folders, but the app's rehearsal library should contain only items the user explicitly saves by reference. This keeps the day-to-day practice surface focused while still letting singers discover material across existing Drive structures.

Alternatives considered:

- Treat every accessible Drive audio file as part of the rehearsal library: rejected because large personal Drives create noise and make repeated practice workflows harder to manage.
- Require a single configured root folder before any browsing can begin: rejected for MVP because singers may need to find material across multiple existing choir folders without extra setup.

### 4. Use a single playable-item model for both full tracks and loops

The playback engine should operate on a normalized playable item with a source audio file and a start/end range. A full track is the special case where the range spans the whole file. A saved loop is the same shape with explicit boundaries.

Alternatives considered:

- Separate track and loop playback pipelines: rejected because it duplicates queue logic and makes playlist behavior harder to reason about.

### 5. Keep MVP playback online-only

Playback will stream from Google Drive-backed sources at play time. If access is unavailable, the app should fail clearly rather than introduce partial offline behavior.

Alternatives considered:

- Partial caching: rejected because it creates offline expectations without delivering a full offline product.
- Full offline support: rejected because download management and invalidation are outside MVP scope.

### 6. Start with personal practice structures, while leaving room for later publishing models

The MVP should assume loops and playlists are primarily user-owned. The data model should still leave room for future ownership scopes such as section or choir without requiring a redesign.

Alternatives considered:

- Shared-by-default rehearsal structures: rejected for MVP because permissions and collaboration would become part of the critical path.

### 7. Use a music-app-inspired navigation shell and waveform-first player

The mobile player should feel closer to a dedicated listening product than a settings-heavy tool. A destination-based shell with Home, Search, and Library surfaces, paired with a persistent mini-player anchored above bottom navigation and a full-screen slide-up playback modal, gives users the interaction patterns they already understand from consumer audio apps while leaving room for rehearsal-specific concepts such as loops and choir-source labels. Because rehearsal stems are metadata-poor, the playback UI should use SoundCloud-style waveforms as the visual hero instead of square album artwork so progress, scrubbing, and loop context stay visually primary.

Alternatives considered:

- Single long-scroll utility screen: rejected because it collapses browsing, saved collections, and playback into one dense surface that does not scale to playlists or queue management.
- File-browser-first navigation everywhere: rejected because it over-exposes Drive structure and makes the day-to-day practice experience feel like source management instead of rehearsal.
- Generic now-playing layouts with square artwork placeholders: rejected because stems do not carry reliable artwork metadata and fake cover slots waste space better used for waveform progress and direct scrubbing.

### 8. Model playlist membership as ordered playlist-entry relationships

Playlists should not store only a flat array of saved item identifiers. Instead, the app should persist an app-owned playlist-entry relationship for each playlist membership so a saved track or saved loop can belong to multiple playlists, appear more than once in the same playlist when needed, and keep an explicit per-playlist index that can be reordered without mutating the underlying saved item.

Alternatives considered:

- Store item identifiers directly on the playlist object: rejected because it makes duplicate-safe insertions, many-to-many membership, and independent per-playlist ordering harder to reason about.
- Store playlist order metadata on the saved track or loop itself: rejected because ordering belongs to the playlist relationship, not to the reusable rehearsal item.

### 9. Keep playlist management UI state outside the playback engine

The core playback engine should continue to operate on persisted playable items and ordered queue inputs. Presentation concerns such as track context menus, playlist selector overlays, `EditState`, toasts, and snackbars should live in screen-level or feature-level UI state models so playback transport remains modular and rebuilds queues only from persisted playlist-entry order.

Alternatives considered:

- Store modal, edit-mode, or feedback state inside playback services: rejected because it couples transient UI behavior to transport logic and makes it harder to reuse playback outside a single playlist screen.
- Let queue order depend on the currently open drag state before save: rejected because playback should reflect committed playlist data, not in-progress screen interactions.

## UI / UX Direction

- Keep discovery separate from ownership: Drive browsing and search help users find material, while Library focuses on saved tracks, loops, and playlists.
- Preserve playback context with a global audio engine and a persistent mini-player anchored above bottom navigation whenever an active track is loaded.
- Treat waveforms as the playback hero for metadata-poor stems: use a simplified non-interactive waveform in the mini-player and a large interactive SoundCloud-style waveform in the dedicated playback modal instead of square artwork.
- Keep mini-player text compact: title truncates by default, optional part or section labels stay secondary, and marquee activates only while the item is actively playing.
- Use direct-manipulation audio controls: a dual-thumb range slider for loop selection, direct horizontal waveform scrubbing in the dedicated playback modal, and a speaker-annotated volume slider when in-app volume is shown.
- Use one platform-consistent music icon vocabulary across transport, queue, library, and playlist surfaces so play / pause, shuffle, repeat, queue, More Options, drag handles, and speaker or mute states stay recognizable and visually distinct.
- Use More Options bottom sheets and selector overlays for add-to-playlist flows so track rows can stay lightweight while still exposing the expected music-app management actions.
- Favor scan-first sections, segmented collections, and strong playback hierarchy over dense form controls.
- Keep playlist detail playback-first with a visible `PlayAll` action, row-tap playback from the tapped position, and an explicit edit mode for reorder and removal work.
- Keep queue state close to playback through a dedicated Up Next surface reachable from the playback modal. The dedicated playback screen should always keep skip-back / play-pause / skip-forward controls available for the current item, and when playback comes from a playlist or queue it should additionally expose previous / next item controls without showing queue navigation for standalone track playback.
- Prefer toast and snackbar feedback for playlist assignment and removal so the user can stay in context and undo destructive changes without route changes.
- Encode rehearsal context directly in the UI through loop badges, source labels, and playlist provenance.

Companion wireframes for these surfaces live in `specs/mobile-rehearsal-player-ui/mockups.md`.

## Risks / Trade-offs

- [Google Drive streaming behavior may be inconsistent across file types or permissions] → Validate supported formats and access patterns early with representative Drive content.
- [Drive browsing and search across large personal and shared libraries may feel noisy or slow] → Keep the saved rehearsal library app-owned so discovery and repeated practice remain separate surfaces.
- [Loop boundaries may feel imprecise for musically sensitive excerpts] → Define loop markers as millisecond offsets and test acceptability with real rehearsal audio before expanding scope.
- [Native playback integration may behave differently across iOS and Android] → Keep queue semantics app-defined and use native controls as a transport surface, not as the source of truth.
- [Playlist UI state and playback queue state could drift apart during editing] → Keep temporary edit state local to the playlist screen and rebuild playback from persisted playlist-entry order after `saveEdits`.
- [A music-app-inspired shell could accidentally hide rehearsal-specific actions behind polished visuals] → Keep save, loop, add-to-playlist, and queue actions explicit in the main interaction surfaces rather than burying them in overflow menus.
- [Icons, waveform treatments, or continuous controls could drift into inconsistent semantics across screens] -> Lock the mockups and UI requirements to waveform-first playback, slider-based loop selection, direct waveform scrubbing, and familiar music-control icon behavior before more playback polish work lands.
- [Deferring offline support may limit use in poor-network environments] → Keep the scope explicit in product messaging and design persistence so offline can be added later without changing domain objects.
- [A narrow MVP may under-serve conductors who want shared structures immediately] → Optimize first for singer rehearsal value and add publishing workflows only after the core player is validated.

## Migration Plan

1. Create the mobile client and shared domain packages inside the Nx workspace.
2. Implement Google authentication plus Drive browsing and search for the supported MVP file set.
3. Implement saving and loading of app-owned Drive source references for the rehearsal library.
4. Implement the playback engine around the playable-item abstraction.
5. Add the destination-based mobile shell and align discovery, search, saved-library, and loop-builder surfaces around the already-working playback model.
6. Add playlist assignment flows, ordered playlist-entry persistence, and queue behavior on top of the same playback model.
7. Layer playlist detail, waveform-first playback modal, queue, and native transport integration onto those behaviors.
8. Validate the staged interaction model and playback behavior on supported mobile platforms.

Rollback is low risk because this is the first product slice in a greenfield repository. If the chosen media stack proves insufficient, the client implementation can change without invalidating the proposed domain model.

## Open Questions

- Should Drive search default to the current folder, or span all accessible Drive content from the first release?
- How should the browser surface shared drives versus shared folders in the first shipped UX?
- What minimum audio format set should be considered supported in MVP?
- Should playlists in MVP be strictly personal, or can a later server-side publish model be anticipated from day one?
- How precise do loop markers need to be for the target rehearsal material to feel trustworthy?
