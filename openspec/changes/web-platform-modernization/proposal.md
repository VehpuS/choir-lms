## Why

An audit of the web export against `modern-web-guidance` (guides `accessibility`, `dialog`, `security`, `install-web-app`, `dark-mode`, `motion`, `efficient-background-processing`, `platform-controls-dismiss-dialog`, `prevent-page-scroll-under-modal-dialog`) found gaps in the page shell, installability, overlays, storage durability, security posture and reduced-motion coverage, plus one outright bug in `public/index.html`. The full findings table, with evidence and confidence, is in `design.md`. Nothing here changes what the app does for a user who already has a working setup; it closes holes that bite specific browsers, assistive technology and installed use.

## What Changes

- **Bug fix:** `public/index.html` uses the JSX attribute spelling `httpEquiv` on a plain HTML `<meta>`; browsers ignore it. Use `http-equiv` or drop the obsolete IE tag.
- **Page metadata:** add `description`, `theme-color` (matching the app background) and `color-scheme`, and a web app manifest with a stable `id` so the app is installable and opens standalone.
- **Overlays:** give the sheet/dialog backdrop an accessible name, mark modal surfaces as dialogs with a name, trap and restore focus on web, and make Escape and the browser back gesture close the topmost layer consistently (verify first; fix only what a scenario shows failing).
- **Reduced motion:** honour `prefers-reduced-motion` in sheet/modal transitions and other animation outside the playback surface.
- **Forced colors / contrast:** the app has no `forced-colors` or `prefers-contrast` handling; add a minimal pass for focus rings and the controls that rely on colour alone.
- **Storage durability:** request persistent storage once for the offline audio, waveform peaks and prepared stems (today only recordings ask), and surface when the browser declines.
- **Security hardening:** a meta-delivered Content-Security-Policy compatible with the mock-network allowlist; review the web token in `localStorage`; confirm external links open with `noopener`.
- **Rehearsal ergonomics (no guide covers these; scoped as optional):** Screen Wake Lock while sheet music or lyrics are open or the player is playing; `navigator.mediaSession` metadata and actions if the web track player does not already set them.
- **Process:** every web-visible fix lands with a browser scenario. Because this change touches shared shell, overlay and playback surfaces, **the full browser matrix (`browser-test-matrix`, the `browser-matrix` lane) MUST be run and pass before merge**, and the PR description says so.

## Capabilities

### New Capabilities

- `web-platform-conformance`: what the web export guarantees about document metadata, installability, overlay accessibility, motion and contrast preferences, storage durability and security headers, plus the merge gate for changes to it.

## Impact

- `packages/mobile-rehearsal-player/public/index.html`, `app.config.ts` (manifest, icons), `src/app/library/components/modal-surface-base/`, `src/app/components/{escape-to-dismiss,focus-on-mount}/`, `src/app/library/offline`, `src/app/library/playback/audio-cache`, `src/app/library/recording/recordings-store-instance.ts`, `src/app/auth/google-drive/`.
- `tools/browser-session/`: new scenarios, each located by accessible name, offline.
- `README.md` and `docs/mobile-cross-platform-audio-playback.md` if wake lock or media session change the playback path.
- Deployment: GitHub Pages cannot send response headers, so the CSP is a `<meta>` policy; header-only directives (`frame-ancestors`) are out of scope.
- Merge gate: `npm exec -- nx run mobile-rehearsal-player:browser-test-matrix` must pass, in addition to `browser-test`. The matrix lane is opt-in in CI (`browser-matrix.yml`, via the `browser-matrix` label or dispatch), so a maintainer has to trigger it.
