## 1. Phase 0 — Foundations

- [ ] 1.1 Rewrite `src/app/utils/theme.ts` as the Nocturne token set (ground, surface, text, accent, divider, neutral + accent 100–900 ramps, radius sm/md/lg, the 0.70× spacing scale, three elevation steps). Keep the existing exported key names working where practical so call sites migrate mechanically.
- [ ] 1.2 Add a guard (lint rule or test over source text) that fails on a raw color literal in `src/app/**` outside `theme.ts`, and list the existing violations it catches.
- [ ] 1.3 Migrate the icon layer from `@expo/vector-icons` MaterialCommunityIcons to Phosphor, one glyph at a time behind the existing icon-name unions, and re-verify the repeat-vs-shuffle and drag-handle distinctness scenarios in `mobile-rehearsal-player-ui` against the Phosphor family.
- [ ] 1.4 Convert shared primitives to tokens and to the row-based treatment: `components/explorer/**`, `compact-playable-row-shell`, `compact-playback-action`, `surface-icon-button`, `overflow-menu-trigger`, `interaction-chip`, `section-heading`, `feedback-card`, `destination-header`, `modal-surface-base`, `bottom-sheet-surface`, `centered-dialog-card`.
- [ ] 1.5 Convert the shell: `routing/shell/mobile-shell-styles.ts`, the header card, the tab bar (accent mark + Phosphor glyphs), and the mini-player (mini waveform, accent-ring transport, accent progress line).

## 2. Phase 1 — Destination screens

- [ ] 2.1 Recents: rows instead of the resume card, popular-tag chips on tokens. Companion state: design screen 1a.
- [ ] 2.2 Library shell: large title, view-switcher chips on tokens, and the scroll-affordance fade retuned to the new surface color. Companion states: 1b–1d.
- [ ] 2.3 Files view and explorer rows: leading glyph, 15px medium title, dim meta line, monospaced durations. Companion state: 1b.
- [ ] 2.4 Tracks view: numbered rows, Play all / Shuffle as accent-outline actions, active-row equalizer mark. Companion state: 1c.
- [ ] 2.5 Loops view: loops as first-class rows with parent track and `start–end · length` bracket; the playing loop expands to show its waveform excerpt. Companion state: 1d.
- [ ] 2.6 Playlists and Tags views on tokens (no structural change).
- [ ] 2.7 Add / Drive screen: breadcrumbs, folder and audio rows, accent-outline Save, saved and unsupported-format states, save-acknowledgment card on tokens. Companion state: 1e.
- [ ] 2.8 Search, filter, and sort surfaces restyled with no behavior change: query field, folder/whole-library scope, entity-type filter chips, sort field + direction, tag filters with Any/All match mode, result highlighting. Verify against `mobile-library-organization` scenario-by-scenario that nothing was reduced. Companion state: 1j.

## 3. Phase 2 — Playback and queue surfaces

- [ ] 3.1 Split the playback surface into the two specified states: collapsed (title, context, loop chip, timeline, transport, practice row) and full-screen (waveform as scrubber). Preserve the existing swipe-down-to-dismiss and audio continuity behavior. Companion states: 1f, 1g.
- [ ] 3.2 Retune the transport row: accent-ring play/pause with ambient glow, filled-weight Phosphor transport glyphs, ±15s and queue-navigation controls per the existing conditional-visibility scenarios.
- [ ] 3.3 Queue / Up Next surface on tokens: mode chips, current-item mark, drag handles, playlist save/update actions. Companion state: 1h.
- [ ] 3.4 Loop range selector / loop editor on tokens, with the A/B region and handles drawn on the real waveform. Companion state: 1g.

## 4. Phase 3 — Waveform from real audio

- [ ] 4.1 Spike peak extraction on both platforms: decode-and-downsample to a fixed bucket count on web (`decodeAudioData`) and native. Record measured cost for a 5-minute track and decide bucket count.
- [ ] 4.2 Implement a versioned peak cache keyed by source id + Drive file revision in `local-library-storage`, with invalidation on revision change.
- [ ] 4.3 Render the waveform from peaks in the mini-player, playback surface, loop editor, and loops list; render a neutral flat band, never a synthetic waveform, while peaks are unavailable.
- [ ] 4.4 Remove the stub waveform shape generator and its call sites.

## 5. Phase 4 — Playback shaping engine

- [ ] 5.0 **Gate.** Verify pitch-preserving time-stretch and independent semitone pitch-shift are achievable on native (`AVAudioUnitTimePitch` via SwiftAudioEx) and on web (Web Audio; `playbackRate` alone is insufficient). Report quality and CPU findings and get a go/no-go before 5.1. If web cannot meet the bar, propose the platform-scoping decision explicitly rather than shipping a silently degraded web build.
- [ ] 5.1 Extend the playback abstraction with `setSpeedMultiplier` and `setPitchSemitones`, modeling the speed transform as `multiplier | tempoMap` from the start even though only the scalar branch is implemented. Update `docs/mobile-cross-platform-audio-playback.md`.
- [ ] 5.2 Add the shaping model in `@org/audio-library-models`: `speedMultiplier` (float, 0.50–1.50, default 1.0), `pitchSemitones` (int, −12…+12, default 0), `tempoSource` (`'multiplier' | 'bpm' | 'score'`, only `'multiplier'` implemented), with pure validation/clamping helpers and unit tests.
- [ ] 5.3 Wire ephemeral session shaping: settings apply to the active item, survive pause/resume and queue advance per spec, and reset when specified. Reflect the active shaping in the mini-player and playback surface context lines.

## 6. Phase 5 — Shaping surface and derived entities

- [ ] 6.1 Build the shaping surface: continuous speed slider with a 1.00× detent, semitone pitch stepper, inert BPM / follow-score tempo-source options, and the "session only until saved" statement. Companion state: 1i.
- [ ] 6.2 Remove any pitch-lock affordance and add a regression test or lint guard asserting no pitch-lock icon or copy exists in `src/app/**`.
- [ ] 6.3 Persist derived entities (`sourceRef` + optional `range` + `transform`) in `audio-library-runtime` and `local-library-storage`, with migration-safe reads for existing stored libraries.
- [ ] 6.4 Create-from-shaping flows: save as derived loop (when the active item is a loop or a range is set) and save as derived track, with smart naming defaults consistent with the existing loop-naming requirement.
- [ ] 6.5 Surface derived entities everywhere a track or loop appears: Files / Tracks / Loops views, sort, search results, tag editor and tag filters, queue, playlist membership. Show the transform in the row meta line and keep the source relationship visible.
- [ ] 6.6 Group derived entities under their source in the Files tree and check whether a collapse affordance is needed once several exist for one passage.

## 7. Validation

- [ ] 7.1 `npm exec -- nx run mobile-rehearsal-player:test` and `:typecheck` after each phase.
- [ ] 7.2 Contrast audit: every text/ground pair at 4.5:1 (3:1 for headline-scale type only); accent is not used for body-size text on the dark ground (use `accent-300`).
- [ ] 7.3 Touch-target audit: every interactive control at or above 44pt, per the existing accessibility requirement.
- [ ] 7.4 Screen-by-screen comparison against design screens 1a–1j.
- [ ] 7.5 Manual regression pass: Drive search and save, loop creation, playlist create/playback ordered and shuffle, folder create, tagging, tag filters with Any/All, queue reorder, waveform scrub, Recents, and — once Phase 4–5 land — speed/pitch adjust plus derived-entity create, play, tag, and queue.
