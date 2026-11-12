## 1. Reproduce first

- [ ] 1.1 Scenario `web-document-metadata`: asserts description, theme-color, manifest link, no `httpEquiv` in served HTML (fails today: F1, F2). Written and confirmed failing for the right reason (no description meta); it passes at 2.3, which is when this box is ticked
- [ ] 1.2 Scenarios for the "Verify" findings, each asserting intended behaviour: overlay focus trap and restore and backdrop name (F3, F4), Escape layering and back (F5), reduced motion (F6), forced colors focus ring (F7), external link `noopener` (F11), target sizes ≥ 24×24 CSS px for controls in the shell and a sheet (F14)
- [ ] 1.2a Overlay batch (F3, F4, F5), run on the current export:
  - `overlay-accessibility` — dialog role, name and `aria-modal` PASS; focus moves in, Tab stays inside over 40 presses, and focus returns to the opener (keyboard- and pointer-opened) all PASS, so F4 is already met by the RN-web Modal and the scenario stays as a guard; the dismiss backdrop is an unnamed button FAIL (F3, fixed in 3.1)
  - `overlay-escape-layers` — one Escape closes only the menu over the playback view, a second closes the view: PASS, kept as a guard
  - `overlay-back-gesture` — Back with a sheet open leaves the app (lands on `about:blank`): FAIL (F5). Closing a sheet on Back needs a history entry per overlay, which touches the custom router; a product call, see the checkpoint note in 3.3
- [x] 1.2b Reduced motion, forced colors (F6, F7):
  - `reduced-motion` — the page runs no animation when idle; opening a track menu runs one without the preference and still runs one under `prefers-reduced-motion: reduce`: FAIL (F6 confirmed for the shared sheet transition, fixed in 3.4)
  - `forced-colors` — the first eight keyboard stops each show an outline or border under forced colors: PASS, kept as a guard. It covers the shell's first Tab stops, not every surface; wider coverage is a follow-up if a surface is reported
- [ ] 1.2c Links and target sizes (F11, F14)
- [ ] 1.3 Record which of 1.2 fail; mark the rest in `design.md` as "passes, kept as guard"

## 2. Page shell and installability (F1, F2)

- [ ] 2.1 Fix the `http-equiv` meta in `public/index.html`; add `description`, `theme-color`, `color-scheme`
- [ ] 2.2 Add the web manifest and icons via `app.config.ts`, with `id`, standalone display, base-path-correct `start_url`/`scope`
- [ ] 2.3 Make 1.1 pass; check the export under the GitHub Pages base path, and that `page-scroll-guard` and `landscape-pane-expand` still pass with the manifest and standalone display in place

## 3. Overlays and preferences (F3–F7, F14)

- [ ] 3.1 Name the backdrop; add dialog role, name and modal semantics to `ModalSurfaceBase`
- [x] 3.2 Focus trap and restore for web overlays: not needed, 1.2a passes (F4 met by the RN-web Modal)
- [ ] 3.3 Escape layering already passes (1.2a); Back should close the topmost sheet instead of leaving the app. Decide before building: one history entry per open overlay (push on open, pop on close) in the custom router, versus leaving Back as is
- [ ] 3.4 Reduced-motion handling for modal transitions and the remaining animation sites, reusing `useReduceMotion` (already used by the playback sheet and pane drag)
- [x] 3.5 Forced-colors focus rings: not needed for the shell's first stops, 1.2b passes; reopen if a surface is found without an indicator
- [ ] 3.6 Raise sub-24px targets found in 1.2

## 4. Storage and security (F8–F11)

- [ ] 4.1 Request persistent storage on first offline write; surface the outcome in storage UI
- [ ] 4.2 Decide token storage (F9) in review; implement the chosen option
- [ ] 4.3 Meta CSP from the declared-host allowlist; run the whole scenario set under it
- [ ] 4.4 `noopener` on external links if 1.2 failed

## 5. Optional rehearsal ergonomics (F12, F13) — drop if declined

- [ ] 5.1 Screen Wake Lock around playback and sheet/lyrics viewers, released on `visibilitychange`, with a scenario against a stubbed API
- [ ] 5.2 Media Session metadata and actions if the web player does not set them; update `docs/mobile-cross-platform-audio-playback.md`

## 6. Docs and merge gate

- [ ] 6.1 Update `README.md` (and the playback doc if 5.x lands)
- [ ] 6.2 Run `nx run-many -t lint test typecheck build --all` and `browser-test`
- [ ] 6.3 **Run and pass the full matrix before merge:** `npm exec -- nx run mobile-rehearsal-player:browser-test-matrix`, and the `browser-matrix.yml` workflow (label `browser-matrix` or dispatch) including WebKit and Firefox for 3.x; confirm green on the latest commit
- [ ] 6.4 PR description includes the merge-gate checklist (see design.md, "Verification and merge gate")

## Follow-ups

- [ ] F.1 In `overlay-accessibility`, a third open of the track options sheet (`Soprano Part options`) after two Escape-closed opens times out on click; `elementFromPoint` at the opener's centre returned a "Show in Add" text node, not the button, with no dialog open. Seen while writing 1.2a; the reopen step was dropped from the scenario. Needs a repro to tell a layout shift in the mock library from a real overlay leftover.
