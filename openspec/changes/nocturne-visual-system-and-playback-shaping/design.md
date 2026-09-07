## Context

This change couples a visual-system migration with a new playback capability. They are proposed together because the new capability needed a home in the redesigned playback surface, and because retuning every style block twice would be wasteful. They are separable at the phase boundary: Phase 1–3 (visual system) ship without Phase 4–6 (playback shaping), and the reverse is also true at higher cost.

## Decision 1 — Tokens replace `appTheme`, and nothing hard-codes a hex

`src/app/utils/theme.ts` currently exports eight literal colors, and dozens of style blocks bypass it with inline hexes (`#305c4d`, `#faf6ee`, `#173229`, `#d6d1c4`, `#1f5c40`, `#9a4d2d` and others). Nocturne's rule is that every color, radius, and spacing value comes from a token.

- Rewrite `appTheme` as the full Nocturne token set: `bg`, `surface`, `text`, `accent`, `divider`, the `neutral` and `accent` 100–900 ramps, `radius` (sm 4 / md 8 / lg 14), `space` (the 0.70× scale), and the three elevation steps.
- Add a lint or test guard that fails on a raw hex in `src/app/**` outside `theme.ts`. Without a guard this migration silently regresses the first time someone adds a screen.
- Alternative considered: a React context theme provider. Rejected for now — the app has one theme, and a static token object keeps every existing `StyleSheet.create` call site working with a one-line change.

## Decision 2 — Elevation is an edge, not a stack of shadows

On a dark ground Nocturne expresses elevation as a hairline plus ambient darkness. React Native has no `box-shadow`, so the hairline is `borderWidth: 1` / `borderColor` from the neutral ramp (or an inset-equivalent), and the ambient part uses the platform shadow/elevation props sparingly. The current `destination-header` shadow stack (`shadowRadius: 20`, `elevation: 6`, on top of a filled hero) is replaced by a single edge.

## Decision 3 — Icons move to Phosphor

Nocturne specifies Phosphor. The app uses `@expo/vector-icons`' MaterialCommunityIcons throughout, including in the already-specified icon-semantics requirement (repeat/shuffle distinctness, drag handles, transport). Migrate to `phosphor-react-native`, mapping one-for-one, and re-verify the repeat-vs-shuffle distinctness scenario against the new glyph family — Phosphor's `Repeat` / `RepeatOnce` / `Shuffle` set satisfies it, but the previous change's finding (that a repeat family can collapse into shuffle's shape) must be re-checked, not assumed.

Filled weights are a separate weight prop in Phosphor, not a name suffix; the transport play/pause glyphs use the filled weight and the state icons use regular.

## Decision 4 — Waveform peaks come from real analysis

Requires a peak-extraction path that works for a Drive-hosted file the app streams rather than owns:

1. **Client-side decode on first play.** Fetch the audio (already streamed), decode to PCM, downsample to a fixed bucket count (e.g. 800 min/max pairs), cache the peak array keyed by source id + file revision in local storage. Web uses `AudioContext.decodeAudioData`; native needs a decode bridge.
2. **Progressive peaks from the playback engine.** Cheaper, but yields no waveform for the unplayed portion — which is the part the user scrubs into. Rejected.
3. **Server-side precompute.** No backend exists in this repo. Out of scope.

Option 1 is the recommendation, with a documented fallback: until peaks are available for an item, render a neutral flat band rather than a fake waveform, so the UI never implies analysis it does not have. The peak cache should be versioned so a changed Drive revision invalidates it.

## Decision 5 — Derived entities store a transform, not rendered audio

A derived track or loop is `{ id, name, sourceRef, range?, transform: { speedMultiplier, pitchSemitones, tempoSource } }`, persisted alongside saved tracks and loops, and applied by the playback engine at play time.

- Consistent with the existing by-reference Drive model — no audio is copied, and nothing is stored that the "no offline playback" MVP boundary forbids.
- A derived loop is a loop with a transform; a derived track is a saved track with a transform. Both reuse existing playable-item plumbing rather than introducing a fourth entity kind, which keeps queue, playlists, tags, and search working with no per-feature changes.
- Duration shown for a derived entity is the source duration divided by the speed multiplier, computed, not stored.
- Alternative considered: render and store transformed audio. Rejected — needs offline storage, a render pipeline, and an audio-license question, and it duplicates material the choir already shares.

## Decision 6 — Two independent axes, no pitch lock

- `speedMultiplier`: continuous float, proposed clamp 0.50–1.50, default 1.0, never alters pitch.
- `pitchSemitones`: integer, clamp −12…+12, default 0, never alters tempo.

Because the two are independent and speed always preserves pitch, a pitch-lock affordance would be a control with one state. It is prohibited by the spec delta so it cannot creep back in as a "standard" transport icon.

Engine implications: this needs time-stretch and pitch-shift independently. Native (SwiftAudioEx / AVAudioEngine) has `AVAudioUnitTimePitch`, which does both. Web needs a Web Audio graph — `playbackRate` alone shifts pitch and is therefore not sufficient on its own; a phase-vocoder or SoundTouch-style node is required. Verify feasibility on both platforms before committing to Phase 4; `docs/mobile-cross-platform-audio-playback.md` must be updated with whatever the playback abstraction gains.

## Decision 7 — Tempo source as an extension point

Speed carries `tempoSource: 'multiplier' | 'bpm' | 'score'`. Only `'multiplier'` is implemented. The shaping surface shows all three with the unimplemented two visibly inert, so the eventual BPM and score-follow work adds a mode rather than relocating the control. Score-follow implies a tempo map (a time → rate curve) rather than a scalar, so the transform type should be modeled as `multiplier | tempoMap` from the start even while only the scalar branch is built.

## Risks

- **Playback-engine capability is the gating risk.** If web cannot do pitch-preserving time-stretch at acceptable quality, speed/pitch may have to be native-only, which contradicts the GitHub Pages web build being a real target. Resolve in Phase 4.0 before building UI.
- **Breadth of the restyle.** Every screen changes. Mitigated by doing tokens first and a shared-primitive pass second, so most screens change by inheritance rather than by hand.
- **Derived entities multiply library rows.** A singer who saves three speeds of one passage gets three rows. Mitigated by showing the transform in the row's meta line and grouping derived entities under their source in the Files tree; watch for whether this needs a collapse affordance.
