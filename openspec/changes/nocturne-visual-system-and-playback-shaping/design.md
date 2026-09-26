## Context

This change couples a visual-system migration with a new playback capability. They are proposed together because the new capability needed a home in the redesigned playback surface, and because retuning every style block twice would be wasteful. They are separable at the phase boundary: task groups 1–4 (visual system and waveform) ship without groups 5–6 (playback shaping), and the reverse is also true at higher cost. Throughout this change, "group N" means the numbered section `N.` in `tasks.md`.

## Decision 1 — Tokens replace `appTheme`, and nothing hard-codes a hex

`src/app/utils/theme.ts` currently exports eight literal colors, and dozens of style blocks bypass it with inline hexes (`#305c4d`, `#faf6ee`, `#173229`, `#d6d1c4`, `#1f5c40`, `#9a4d2d` and others). Nocturne's rule is that every color, radius, and spacing value comes from a token.

- Rewrite `appTheme` as the full Nocturne token set: `bg`, `surface`, `text`, `accent`, `divider`, the `neutral` and `accent` 100–900 ramps, `radius` (sm 4 / md 8 / lg 14), `space` (the 0.70× scale), and the three elevation steps.
- Status colors are an app-specific extension: Nocturne and the 1a–1j mockups define none, but Drive errors, unsupported-format warnings, and saved/ready states need them. Add muted `danger` / `warning` / `success` tokens — a desaturated text step at ≥4.5:1 on `bg` and `surface` plus a low-alpha tinted fill, mirroring `accentRegionFill` — so status reads without flooding a hue. Status always pairs with an icon or label, never color alone.
- Migration order: after the token rewrite, run a color-only pass (task 1.2.1) that moves every hard-coded color onto tokens before any structural restyle. Converting colors per screen in later tasks would leave light surfaces under light token text in the meantime, which is a legibility regression, not just an inconsistency.
- Add a lint or test guard that fails on a raw hex in `src/app/**` outside `theme.ts`. Without a guard this migration silently regresses the first time someone adds a screen.
- Alternative considered: a React context theme provider. Rejected for now — the app has one theme, and a static token object keeps every existing `StyleSheet.create` call site working with a one-line change.

## Decision 2 — Elevation is an edge, not a stack of shadows

On a dark ground Nocturne expresses elevation as a hairline plus ambient darkness. React Native has no `box-shadow`, so the hairline is `borderWidth: 1` / `borderColor` from the neutral ramp (or an inset-equivalent), and the ambient part uses the platform shadow/elevation props sparingly. The current `destination-header` shadow stack (`shadowRadius: 20`, `elevation: 6`, on top of a filled hero) is replaced by a single edge.

## Decision 3 — Icons move to Phosphor

Nocturne specifies Phosphor. The app uses `@expo/vector-icons`' MaterialCommunityIcons throughout, including in the already-specified icon-semantics requirement (repeat/shuffle distinctness, drag handles, transport). Migrate to `phosphor-react-native`, mapping one-for-one, and re-verify the repeat-vs-shuffle distinctness scenario against the new glyph family — Phosphor's `Repeat` / `RepeatOnce` / `Shuffle` set satisfies it, but the previous change's finding (that a repeat family can collapse into shuffle's shape) must be re-checked, not assumed.

Filled weights are a separate weight prop in Phosphor, not a name suffix; the transport play/pause glyphs use the filled weight and the state icons use regular.

## Decision 4 — Waveform peaks come from real analysis

Requires a peak-extraction path that works for a Drive-hosted file the app streams rather than owns:

1. **Client-side decode on first play.** Fetch the audio (already streamed), decode to PCM, downsample to a fixed bucket count (e.g. 800 min/max pairs), cache the peak array in `local-library-storage` keyed by `driveFileId` + a Drive content version. `DriveAudioSource` stores `modifiedTime` today but no revision id; the spike (task 4.1) decides whether to add `headRevisionId` / `md5Checksum` to the Drive fields requested in `packages/google-drive` or to key on `modifiedTime`. Provenance refresh on rediscovery (from `improve-drive-search-and-bulk-library-import`) already rewrites Drive-owned metadata, so a changed version naturally misses the cache. Web uses `AudioContext.decodeAudioData`; native needs a decode bridge.
2. **Progressive peaks from the playback engine.** Cheaper, but yields no waveform for the unplayed portion — which is the part the user scrubs into. Rejected.
3. **Server-side precompute.** No backend exists in this repo. Out of scope.

Option 1 is the recommendation, with a documented fallback: until peaks are available for an item, render a neutral flat band rather than a fake waveform, so the UI never implies analysis it does not have. The peak cache should be versioned so a changed Drive revision invalidates it.

## Decision 5 — Adjusted entities store a transform, not rendered audio

An adjusted track or loop is `{ id, name, sourceRef, range?, transform: { speedMultiplier, pitchSemitones, tempoSource } }`, persisted alongside saved tracks and loops, and applied by the playback engine at play time.

- Consistent with the existing by-reference Drive model — no audio is copied, and nothing is stored that the "no offline playback" MVP boundary forbids.
- An adjusted loop is a loop with a transform; an adjusted track is a saved track with a transform. Both reuse existing playable-item plumbing rather than introducing a fourth entity kind, which keeps queue, playlists, tags, and search working with no per-feature changes.
- Duration shown for an adjusted entity is the source duration divided by the speed multiplier, computed, not stored.
- An adjusted entity has no Drive provenance of its own. Original-location actions (`Show in Add`, `Open in Google Drive`) and availability resolve through `sourceRef`, and the bulk-import planner's canonical-source reuse (keyed on `driveFileId`) only considers saved sources, so an import never reuses, links, or reports an adjusted entity as "already present".
- Removing a source track cascades to its adjusted entities the same way it cascades to its loops, and the confirmation summary lists them.
- Alternative considered: render and store transformed audio. Rejected — needs offline storage, a render pipeline, and an audio-license question, and it duplicates material the choir already shares.

## Decision 6 — Two independent axes, no pitch lock

- `speedMultiplier`: continuous float, proposed clamp 0.50–1.50, default 1.0, never alters pitch.
- `pitchSemitones`: integer, clamp −12…+12, default 0, never alters tempo.

Because the two are independent and speed always preserves pitch, a pitch-lock affordance would be a control with one state. It is prohibited by the spec delta so it cannot creep back in as a "standard" transport icon.

Engine implications: this needs time-stretch and pitch-shift independently. Native (SwiftAudioEx / AVAudioEngine) has `AVAudioUnitTimePitch`, which does both. Web needs a Web Audio graph — `playbackRate` alone shifts pitch and is therefore not sufficient on its own; a phase-vocoder or SoundTouch-style node is required. Verify feasibility on both platforms at the task 5.0 gate before committing to groups 5–6; `docs/mobile-cross-platform-audio-playback.md` must be updated with whatever the playback abstraction gains.

## Decision 7 — Tempo source as an extension point

Speed carries `tempoSource: 'multiplier' | 'bpm' | 'score'`. Only `'multiplier'` is implemented. The shaping surface shows all three with the unimplemented two visibly inert, so the eventual BPM and score-follow work adds a mode rather than relocating the control. Score-follow implies a tempo map (a time → rate curve) rather than a scalar, so the transform type should be modeled as `multiplier | tempoMap` from the start even while only the scalar branch is built.

## Risks

- **Playback-engine capability is the gating risk.** If web cannot do pitch-preserving time-stretch at acceptable quality, speed/pitch may have to be native-only, which contradicts the GitHub Pages web build being a real target. Resolve at the task 5.0 gate before building UI.
- **Breadth of the restyle.** Every screen changes. Mitigated by doing tokens first and a shared-primitive pass second, so most screens change by inheritance rather than by hand.
- **Adjusted entities multiply library rows.** A singer who saves three speeds of one passage gets three rows. Mitigated by showing the transform in the row's meta line and grouping adjusted entities under their source in the Files tree; watch for whether this needs a collapse affordance.

## Decision 8 — Surfaces without a mockup inherit primitives, not bespoke styling

Several surfaces shipped after the 1a–1j mockups were drawn: Drive search selection mode (`drive-search-selection-toolbar`, selected-state rows in `drive-explorer-list` / `drive-explorer-folder-row`), the Drive import review screen (`screens/drive-import-review/**`: destination picker, mode picker, summary counts, progress, completion), the original-location actions in the saved-track options menu, `AsyncActionStatusCard`, and the `DestinationHeader` subtitle. Each carries its own inline hexes and filled `listMarker` primary buttons today.

- Restyle them by composing the converted shared primitives — row anatomy, accent-outline primary / neutral-outline secondary actions, `FeedbackCard` / `AsyncActionStatusCard`, `bottom-sheet-surface`, `interaction-chip` — rather than drawing new mockups first. Where a surface needs a pattern the mockups don't show, borrow the closest mockup: selection toolbar and selected rows from 1e rows + 1j chips, import review from 1h's pinned two-action footer and 1j's kicker/segmented controls, import progress from the 2 px accent progress line, completion from the 1e save-acknowledgment card.
- Extract a shared outlined action button (accent and neutral variants) in task 1.4, since the import review footer, the selection toolbar, Play all / Shuffle, Save loop, and the queue footer all need the same thing, and each currently hand-rolls a filled button.
- Row selection glyphs map to Phosphor `circle` (unselected) and fill-weight `check-circle` (selected), with the selected state also conveyed through the row's accent title treatment — never by color alone (existing icon-only accessibility scenario).
- If implementing one of these surfaces turns up a real design question rather than a token swap, stop and ask for a mockup instead of improvising (per the deliberate-execution loop).
