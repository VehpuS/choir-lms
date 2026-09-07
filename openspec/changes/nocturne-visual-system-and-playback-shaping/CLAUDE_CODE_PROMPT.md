# Prompt for the Claude Code session

Paste this (adjust the bundle path) into a Claude Code session opened at the repo root.

---

I have a design handoff bundle at `choir-lms/openspec/changes/nocturne-visual-system-and-playback-shaping`. Read `README.md` there first, then look at every image in `reference-images/`.

Your task: **create an OpenSpec change in this repo** specifying the mobile rehearsal player's move onto the Nocturne visual system plus the new playback-shaping capability. Do not write implementation code in this pass.

Steps:

1. Read `openspec/changes/CLAUDE.md` and skim the two live changes (`improve-drive-search-and-bulk-library-import`, `mobile-rehearsal-ux-audit-fixes`) so the new change matches house conventions exactly — file set, requirement/scenario format, id naming.
2. Read the current specs the change touches: `openspec/specs/mobile-rehearsal-player-ui/`, `mobile-library-organization/`, `practice-loops-and-playlists/`, `recents-tag-navigation/`.
3. Read the drafted change in the bundle at `openspec-change/nocturne-visual-system-and-playback-shaping/` — proposal, design, tasks, and the four spec-delta folders. It is a complete draft written against the design, but it was written outside the repo. **Validate before adopting:**
   - every requirement it modifies still exists, with the wording it assumes;
   - every source path in `## Impact` is current (`src/app/utils/theme.ts`, `src/app/routing/shell/**`, `routing/playback/**`, `routing/queue/**`, the shared primitives listed in tasks 1.4, the icon layer);
   - nothing listed under "Explicitly Unchanged" has since changed;
   - the change id and capability names fit the repo's existing naming.
4. Write the change into `openspec/changes/<change-id>/`, fixing anything step 3 turned up. Keep the seven-phase task breakdown and keep **task 5.0 as a hard gate**: verify pitch-preserving time-stretch and independent semitone pitch-shift are achievable on native (`AVAudioUnitTimePitch` via SwiftAudioEx) _and_ on web (Web Audio — `playbackRate` alone is insufficient) before any shaping implementation. If web can't meet the bar, the change must surface the platform-scoping decision explicitly rather than shipping a silently degraded web build.
5. Copy the ten reference images into the change directory (e.g. `openspec/changes/<change-id>/design-assets/`) and reference them by filename from the relevant requirements and tasks, so every UI requirement points at the screen that shows it. Cite screens by their ids `1a`–`1j`.
6. Validate the change with whatever OpenSpec tooling the repo provides, and report: the final file tree, anything in the draft you corrected and why, and any requirement you could not delta cleanly.

Constraints to carry into the specs:

- No feature is removed and no destination moves. The advanced search / filter / sort / tag surface is restyled only — verify scenario by scenario that nothing was reduced, merged, or relocated.
- Speed always preserves pitch, so **no pitch-lock control may exist anywhere**; the change should include a guard asserting that.
- Derived tracks and loops store `sourceRef` + optional `range` + `transform` — metadata, never rendered audio. This keeps the by-reference Drive model and the "no offline playback" MVP boundary intact.
- The waveform must render from real audio peaks (versioned cache keyed by source id + Drive file revision), with a neutral flat band as the unavailable state — never a synthetic shape. Flag whether this belongs in this change or should be split into its own; the draft argues for keeping it here because the redesign makes the waveform the primary scrubbing surface.
- Accessibility: 44 pt minimum touch targets, 4.5:1 text contrast (3:1 for headline-scale type only), and accent never used for body-size text on the dark ground (use `accent-300`).
