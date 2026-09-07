## Why

Two things arrive together. First, the mobile rehearsal player's visual layer is being moved onto the Nocturne design system (dark near-neutral ground, Inter at medium weight, 8px radii, a single blurple accent used as a line and a glow rather than a flood) and onto mainstream music-player list conventions — rows instead of stacked cards, one large title per destination, transport where a singer's thumb already rests. Design artifacts for every affected surface exist and are referenced below. No feature is removed and no destination moves: the three-tab shell, the five Library views, the explorer, the mini-player, the bottom-sheet playback surface, and the queue all keep their current behavior.

Second, the redesign work surfaced a rehearsal capability the app does not have and that the visual layer needs a home for: **playback shaping**. Singers learn a hard passage slowly and, when their part sits at the edge of their range, at a different pitch. Today neither is possible. Speed and pitch also cannot be a purely transient control, because the settings a singer arrives at for a passage are exactly the thing they want back next rehearsal — so each is specified both as an ephemeral session option and as an input to creating a derived track or loop in the library.

Speed and pitch are deliberately separate axes. Speed is a continuous multiplier that never shifts pitch; pitch moves in whole semitones and never changes tempo. Because speed cannot shift pitch, there is no pitch-lock control anywhere in the design — pitch preservation is the only behavior speed change has in this app.

## What Changes

### Visual system (modified capability)

- Adopt Nocturne as the mobile app's visual system: `--color-bg` #161826 ground, `--color-surface` #232532, `--color-text` #e9e9ed, accent #9184d9, the 100–900 tonal ramps for surfaces/borders/muted text, Inter at weight 500 for headings, 8px radii, the compact (0.70×) spacing scale, and rules that fade to transparent at their ends. Replaces the current parchment-and-forest `appTheme` palette in `src/app/utils/theme.ts`.
- Primary actions become accent **outlines**, not accent fills; the transport play/pause control is an accent ring with an ambient accent glow. No large area is flooded with accent.
- Library and Add lists move from card-per-entity to row-per-entity with a leading Phosphor glyph, a 15px medium title, a 12px dim meta line, and monospaced durations and time ranges. Hierarchy is carried by type and space because Drive-backed rehearsal audio has no artwork.
- Icon set standardizes on Phosphor (per Nocturne), replacing MaterialCommunityIcons in the mobile shell.
- Loops present as first-class library rows beside tracks, each showing its parent track and its `start–end · length` bracket.
- The dedicated playback surface becomes explicitly two-state: collapsed practice controls, and a full-screen state where the waveform is the scrubbing UI.

### Waveform fidelity (modified capability — separable)

- The waveform is required to render from peak data derived from the actual audio rather than a synthetic shape. The current waveform is a stub and reads the same for every track, which defeats the one visual affordance a metadata-poor stem has. This is the one item in this proposal that could reasonably be split into its own change; it is included here because the redesign makes the waveform the primary scrubbing surface.

### Playback shaping (new capability)

- Ephemeral session controls for **speed** (continuous multiplier, pitch never shifted) and **pitch** (semitone steps, tempo never changed), reachable from the playback surface, applying to the active track or loop for the session only.
- Committing the current shaping settings creates a **derived track** or **derived loop**: a first-class library entity that references its source and carries its transform, so the settings come back next rehearsal and can be tagged, queued, added to playlists, and searched like any other entity.
- **Tempo source** is a named, extensible field on speed. This change ships the flat multiplier only; BPM entry and score-follow (matching a track to a MIDI or MusicXML file for dynamic tempo maps) are specified as future tempo sources so the control does not have to move when they land.
- No pitch-lock control is added, and none should appear in any surface: speed change in this app always preserves pitch.

## Capabilities

### New Capabilities

- `playback-shaping`: speed and pitch as both ephemeral playback options and derived-entity creation inputs, with tempo source as an extension point.

### Modified Capabilities

- `mobile-rehearsal-player-ui`: gains a Nocturne visual-system requirement (ground, ramps, type, radii, spacing, accent-as-line, Phosphor icons, row-based lists); the dedicated-playback-screen requirement gains scenarios for the collapsed/expanded two-state split, for the waveform rendering from real analysis, and for reaching the shaping surface; the icon-semantics requirement gains an explicit prohibition on a pitch-lock control.
- `practice-loops-and-playlists`: saved loops and derived entities are both usable wherever a saved track or loop is usable (queue, playlists, tags, search).
- `mobile-library-organization`: derived entities appear in the Files/Tracks/Loops views, sort, and search results, and are visually distinguishable from their source.

### Explicitly Unchanged

The advanced search, filter, and tag features stay exactly as specified today — app-owned dedicated search, folder vs whole-library scope, entity-type filters, explicit sort field and direction, tag filters with Any/All match mode, the tag editor's suggestion row, Recents' popular tags, and the Tags view with usage counts. This change restyles those controls and does not reduce, merge, or relocate any of them. `mobile-library-organization`'s search/filter/sort requirements and all of `recents-tag-navigation` are untouched except for derived entities appearing in results.

## Impact

- Code: `src/app/utils/theme.ts` (token rewrite), every `styles.ts` / `StyleSheet.create` block under `src/app/**` that reads `appTheme` or hard-codes a hex, the shell (`src/app/routing/shell/**`), the playback surface (`src/app/routing/playback/**`), the queue (`src/app/routing/queue/**`), Library and Add screens and their row/explorer components, and the icon layer (MaterialCommunityIcons → Phosphor).
- New code: a playback-shaping model and hook, a shaping surface, derived-entity persistence in `@org/audio-library-models` / `audio-library-runtime` and `local-library-storage`, and waveform peak extraction.
- Playback engine: speed and pitch require a rate/pitch-capable playback path on both native (SwiftAudioEx / react-native-track-player) and web (Web Audio). See `docs/mobile-cross-platform-audio-playback.md` and `design.md` — this is the main technical risk in the change.
- Persisted data: derived entities add a stored shape. `design.md` proposes transform metadata rather than rendered audio, which keeps the change compatible with the existing by-reference Drive model and the "no offline playback" MVP boundary.
- Design artifacts: `Rehearsal Player Redesign.dc.html` (screens 1a–1j) in the design project is the companion mockup set referenced by the spec deltas.

## Non-Goals

- No offline playback, no downloaded or rendered audio files.
- No score annotation, no recording overlay, no collaboration.
- No BPM entry and no MIDI/MusicXML score-follow implementation in this change — specified as future tempo sources only.
- No change to Drive auth, Drive browsing behavior, or the by-reference save model.
- No new destination and no change to the three-tab shell.
