## 1. Foundations

- [x] 1.1 Rewrite `src/app/utils/theme.ts` as the Nocturne token set (ground, surface, text, accent, divider, neutral + accent 100–900 ramps, radius sm/md/lg, the 0.70× spacing scale, three elevation steps). Keep the existing exported key names working where practical so call sites migrate mechanically.
- [ ] 1.2 Add a guard (lint rule or test over source text) that fails on a raw color literal in `src/app/**` outside `theme.ts`, and list the existing violations it catches (a raw `#rrggbb` grep over non-spec `src/app/**` files finds ~265 hits as of 2026-09-23, including the new `screens/drive-import-review/**` and `DestinationHeader` subtitle).
- [ ] 1.3 Migrate the icon layer from `@expo/vector-icons` MaterialCommunityIcons to Phosphor, one glyph at a time behind the existing icon-name unions, and re-verify the repeat-vs-shuffle and drag-handle distinctness scenarios in `mobile-rehearsal-player-ui` against the Phosphor family. 24 non-spec files import `@expo/vector-icons` today, including the new `drive-explorer-folder-row` selection glyphs (`folder-outline` / `check-circle` / `circle-outline`) and the Add header refresh `progress-clock`. `phosphor-react-native` is a new dependency: update `package-lock.json` and run `npm ci` in the same slice.
- [ ] 1.4 Convert shared primitives to tokens and to the row-based treatment: `library/components/explorer/**`, `components/compact-playable-row-shell`, `components/compact-playback-action`, `components/surface-icon-button`, `components/overflow-menu-trigger`, `components/drag-handle`, `components/row-preparing-indicator`, `components/scoped-success-acknowledgment`, `components/summary-card`, `components/destination-header` (including its new `subtitle`), `library/components/interaction-chip`, `section-heading`, `sort-field-chip-row`, `feedback-card` (including its new `leading` slot), `async-action-status-card`, `options-menu-sheet/**`, `tag-editor-sheet/**`, `saved-library-detail-card-shell`, `modal-surface-base`, `bottom-sheet-surface`, `centered-dialog-card`.
  - Extract one shared outlined action button (accent and neutral variants, 44pt minimum) and use it in place of the hand-rolled filled buttons in the selection toolbar, import review footer, and playback/queue actions (design Decision 8).
- [ ] 1.5 Convert the shell: `routing/shell/mobile-shell-styles.ts`, the header card, the tab bar (accent mark + Phosphor glyphs), and the mini-player (mini waveform, accent-ring transport, accent progress line).

## 2. Destination screens

- [ ] 2.1 Recents: rows instead of the resume card, popular-tag chips on tokens. Companion state: design screen 1a.
- [ ] 2.2 Library shell: large title, view-switcher chips on tokens, and the scroll-affordance fade retuned to the new surface color. Companion states: 1b–1d.
- [ ] 2.3 Files view and explorer rows: leading glyph, 15px medium title, dim meta line, monospaced durations. Companion state: 1b. The FAB in 1b overlaps the mini-player band; it must still satisfy `mobile-library-organization` "Files create control does not obscure the current folder's last visible row".
- [ ] 2.4 Tracks view: numbered rows, Play all / Shuffle as accent-outline actions, active-row equalizer mark. Companion state: 1c.
- [ ] 2.5 Loops view: loops as first-class rows with parent track and `start–end · length` bracket; the playing loop expands to show its waveform excerpt. Companion state: 1d.
- [ ] 2.6 Playlists and Tags views on tokens (no structural change). Playlist detail's icon-first ordered / shuffle play row uses the 1c Play all / Shuffle pair, inside playlist detail.
- [ ] 2.7 Add / Drive screen: breadcrumbs, My Drive / Shared root selector, folder and audio rows, accent-outline Save, saved and unsupported-format states, save-acknowledgment card on tokens (still dismissible and non-stale per `mobile-rehearsal-player-usability`). Companion state: 1e.
- [ ] 2.8 Search, filter, and sort surfaces restyled with no behavior change: query field, folder/whole-library scope, entity-type filter chips, sort field + direction, tag filters with Any/All match mode, result highlighting. Verify against `mobile-library-organization` scenario-by-scenario that nothing was reduced. Companion state: 1j.
- [ ] 2.9 Drive search results and selection mode (no mockup; design Decision 8): mixed folder / audio result rows with containing-path meta and highlighted matches, progressive-loading and incomplete-discovery status, the `Search results` return action in the explorer header, `drive-search-selection-toolbar` (count, `Select All Matching`, `Cancel`, `Continue`, `Edit Selection`), and Phosphor `circle` / fill `check-circle` selection glyphs. Verify against `mobile-practice-library` and `mobile-rehearsal-player-usability` Drive-search scenarios that nothing changed.
- [ ] 2.10 Drive import review screen (`screens/drive-import-review/**`, no mockup): destination picker, `Preserve structure` / `Flatten` as a segmented control, summary counts in monospace, phased progress as an accent line, completion summary with expandable failed items and `Retry failed`, pinned Back / Cancel / Confirm import footer as outlined actions. Verify against "Bulk Drive imports are reviewed and recoverable" that nothing changed.
- [ ] 2.11 Saved-track original-location actions (no mockup): `Show in Add` / `Open in Google Drive` / `Checking Drive…` in the options menu, the `From <path>` provenance line, and the unresolved-location status card on the shared primitives. Verify against "Users can return to a saved track's original Drive folder".

## 3. Playback and queue surfaces

- [ ] 3.1 Split the playback surface into the two specified states: collapsed (title, context, loop chip, timeline, transport, practice row) and full-screen (waveform as scrubber). Preserve the existing swipe-down-to-dismiss and audio continuity behavior. Companion states: 1f, 1g.
- [ ] 3.2 Retune the transport row: accent-ring play/pause with ambient glow, filled-weight Phosphor transport glyphs, ±15s and queue-navigation controls per the existing conditional-visibility scenarios.
- [ ] 3.3 Queue / Up Next surface on tokens: mode chips, current-item mark, drag handles, playlist save/update actions. Companion state: 1h.
- [ ] 3.4 Loop range selector / loop editor on tokens, with the A/B region and handles drawn on the real waveform. Companion state: 1g.

## 4. Waveform from real audio

- [ ] 4.1 Spike peak extraction on both platforms: decode-and-downsample to a fixed bucket count on web (`decodeAudioData`) and native. Record measured cost for a 5-minute track and decide bucket count.
- [ ] 4.2 Implement a versioned peak cache in `library/storage/local-library-storage.ts` keyed by `driveFileId` + Drive content version (`modifiedTime`, or `headRevisionId` / `md5Checksum` if 4.1 adds it to the fields `packages/google-drive` requests), with invalidation when provenance refresh changes the version.
- [ ] 4.3 Render the waveform from peaks in the mini-player, playback surface, loop editor, and loops list; render a neutral flat band, never a synthetic waveform, while peaks are unavailable.
- [ ] 4.4 Remove the stub waveform shape generator in `components/playback-waveform/model.ts` and its call sites.

## 5. Playback shaping engine

- [ ] 5.0 **Gate.** Verify pitch-preserving time-stretch and independent semitone pitch-shift are achievable on native (`AVAudioUnitTimePitch` via SwiftAudioEx) and on web (Web Audio; `playbackRate` alone is insufficient). Report quality and CPU findings and get a go/no-go before 5.1. If web cannot meet the bar, propose the platform-scoping decision explicitly rather than shipping a silently degraded web build.
- [ ] 5.1 Extend the playback abstraction with `setSpeedMultiplier` and `setPitchSemitones`, modeling the speed transform as `multiplier | tempoMap` from the start even though only the scalar branch is implemented. Update `docs/mobile-cross-platform-audio-playback.md`.
- [ ] 5.2 Add the shaping model in `@org/audio-library-models`: `speedMultiplier` (float, 0.50–1.50, default 1.0), `pitchSemitones` (int, −12…+12, default 0), `tempoSource` (`'multiplier' | 'bpm' | 'score'`, only `'multiplier'` implemented), with pure validation/clamping helpers and unit tests.
- [ ] 5.3 Wire ephemeral session shaping: settings apply to the active item, survive pause/resume and queue advance per spec, and reset when specified. Reflect the active shaping in the mini-player and playback surface context lines.

## 6. Shaping surface and adjusted entities

- [ ] 6.1 Build the shaping surface: continuous speed slider with a 1.00× detent, semitone pitch stepper, inert BPM / follow-score tempo-source options, and the "session only until saved" statement. Companion state: 1i.
- [ ] 6.2 Remove any pitch-lock affordance and add a regression test or lint guard asserting no pitch-lock icon or copy exists in `src/app/**`.
- [ ] 6.3 Persist adjusted entities (`sourceRef` + optional `range` + `transform`) in `audio-library-runtime` and `local-library-storage`, with migration-safe reads for existing stored libraries. Keep adjusted entities out of the bulk-import planner's canonical-source reuse (`drive-import-planner`, `drive-import-plan-classification`) and add planner tests proving an adjusted entity is never reused or reported as already present.
- [ ] 6.4 Create-from-shaping flows: save as adjusted loop (when the active item is a loop or a range is set) and save as adjusted track, with smart naming defaults consistent with the existing loop-naming requirement.
- [ ] 6.5 Surface adjusted entities everywhere a track or loop appears: Files / Tracks / Loops views, sort, search results, tag editor and tag filters, queue, playlist membership. Show the transform in the row meta line and keep the source relationship visible. Route `Show in Add` / `Open in Google Drive` for adjusted entities through their source track, and extend the `Remove from library` confirmation summary and cascade to adjusted entities (reworded requirement in the `mobile-library-organization` delta).
- [ ] 6.6 Group adjusted entities under their source in the Files tree and check whether a collapse affordance is needed once several exist for one passage.

## 7. Validation

- [ ] 7.1 `npm exec -- nx run mobile-rehearsal-player:test` and `:typecheck` after each phase.
- [ ] 7.2 Contrast audit: every text/ground pair at 4.5:1 (3:1 for headline-scale type only); accent is not used for body-size text on the dark ground (use `accent-300`).
- [ ] 7.3 Touch-target audit: every interactive control at or above 44pt, per the existing accessibility requirement.
- [ ] 7.4 Screen-by-screen comparison against design screens 1a–1j (`reference-images/`), plus a consistency pass on the no-mockup surfaces from 2.9–2.11 against their nearest mockup.
- [ ] 7.5 Manual regression pass: Drive search and save, Drive search selection and `Select all matching`, bulk import (preserve and flatten, cancel, retry failed), `Search results` return, `Show in Add` / `Open in Google Drive`, loop creation, playlist create/playback ordered and shuffle, folder create, tagging, tag filters with Any/All, queue reorder, waveform scrub, Recents, and — once groups 5–6 land — speed/pitch adjust plus adjusted-entity create, play, tag, and queue.
