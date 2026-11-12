## 1. Reproduce first

- [ ] 1.1 Scenario `web-document-metadata`: asserts description, theme-color, manifest link, no `httpEquiv` in served HTML (fails today: F1, F2)
- [ ] 1.2 Scenarios for the "Verify" findings, each asserting intended behaviour: overlay focus trap and restore and backdrop name (F3, F4), Escape layering and back (F5), reduced motion (F6), forced colors focus ring (F7), external link `noopener` (F11), target sizes ≥ 24×24 CSS px for controls in the shell and a sheet (F14)
- [ ] 1.3 Record which of 1.2 fail; mark the rest in `design.md` as "passes, kept as guard"

## 2. Page shell and installability (F1, F2)

- [ ] 2.1 Fix the `http-equiv` meta in `public/index.html`; add `description`, `theme-color`, `color-scheme`
- [ ] 2.2 Add the web manifest and icons via `app.config.ts`, with `id`, standalone display, base-path-correct `start_url`/`scope`
- [ ] 2.3 Make 1.1 pass; check the export under the GitHub Pages base path

## 3. Overlays and preferences (F3–F7, F14)

- [ ] 3.1 Name the backdrop; add dialog role, name and modal semantics to `ModalSurfaceBase`
- [ ] 3.2 Focus trap and restore for web overlays, if 1.2 failed
- [ ] 3.3 Escape/back layering fixes, if 1.2 failed
- [ ] 3.4 Reduced-motion handling for modal transitions and other animation
- [ ] 3.5 Forced-colors and contrast pass for focus rings
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
