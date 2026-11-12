## Context

The audit read `public/index.html`, `app.config.ts`, the `*.web.ts(x)` files, `modal-surface-base`, the escape/focus hooks, storage backends and the auth session store, and checked them against the retrieved guides. It was first made at main `f96a75a` and re-checked after merging main at `53bbafe4` (see "Changes on main since the audit"). It was a static read: nothing was run in a browser and no dependencies were installed in the audit session, so each finding carries a confidence and a verifying scenario. "Verify" means the first task is a failing or passing scenario, and a fix is made only if it fails.

## Findings

| #   | Finding                                                                                                                                                                                     | Evidence                                                                     | Guide                              | Confidence                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------- |
| F1  | `<meta httpEquiv="X-UA-Compatible" content="IE=edge" />` is JSX casing in plain HTML; it does nothing, and the IE tag is obsolete.                                                          | `public/index.html:5`                                                        | `html`                             | Bug, certain                        |
| F2  | No `description`, `theme-color` or manifest. The browser UI is not themed to `#161826`, and the app is not installable.                                                                     | `public/index.html`; `app.config.ts` `web` has only `bundler`, `favicon`     | `install-web-app`, `dark-mode`     | Gap, certain                        |
| F3  | Dialog backdrop is a `Pressable` with `accessibilityRole="button"` and no label: an unnamed button for screen readers.                                                                      | `modal-surface-base/index.tsx`                                               | `accessibility` §3                 | Gap, certain                        |
| F4  | Modal surfaces use RN `Modal` (a portal); no `aria-modal`/`accessibilityViewIsModal` hit in `src`; focus is moved in (`useFocusOnMount`) but no code returns it to the opener or traps Tab. | `use-focus-on-mount.web.ts`; grep                                            | `dialog`, `accessibility` §5, §12  | Verify                              |
| F5  | Escape is handled by a custom document listener stack and `onRequestClose`; browser back is not tied to overlays on web.                                                                    | `use-escape-to-dismiss.web.ts`                                               | `platform-controls-dismiss-dialog` | Verify                              |
| F6  | `useReduceMotion` is used only by `playback-surface`; `Modal animationType` slide/fade and other animations elsewhere ignore the preference (8 animation sites outside that surface).       | grep                                                                         | `motion`, `accessibility` §11      | Verify                              |
| F7  | No `forced-colors` or `prefers-contrast` handling anywhere in `src`.                                                                                                                        | grep                                                                         | `color`, `accessibility`           | Gap, certain                        |
| F8  | Persistent storage is requested only by the recordings store; offline audio, waveform peaks and prepared stems live in IndexedDB and are evictable.                                         | `recordings-store-instance.ts:12`; `audio-store.web.ts`, `peak-store.web.ts` | `performance` (storage), `privacy` | Gap, certain                        |
| F9  | The Google access token and expiry are written to `localStorage` on web (script-readable, no CSP to limit script injection). Short-lived, but there is no policy on top.                    | `use-authorization.ts:37`, `authorization-session-store.ts`                  | `security` §1.2, §3.2              | Risk, certain; remedy is a decision |
| F10 | No Content-Security-Policy. GitHub Pages sends no headers, so only a `<meta>` policy is possible.                                                                                           | `public/index.html`                                                          | `security` §3.2                    | Gap, certain                        |
| F11 | `Linking.openURL` is used for Drive, mailto and share links; confirm `noopener` on the opened window.                                                                                       | 5 call sites                                                                 | `security`                         | Verify                              |
| F12 | No Screen Wake Lock: the screen can sleep over sheet music or lyrics during a rehearsal.                                                                                                    | grep `wakeLock` empty                                                        | no matching guide                  | Gap, product call                   |
| F13 | No `navigator.mediaSession` in app source; `react-native-track-player` may set it on web, unchecked.                                                                                        | grep; `docs/mobile-cross-platform-audio-playback.md`                         | no matching guide                  | Verify                              |
| F14 | Target sizes: a 44pt `space.touchTarget` token exists but only ~18 `minHeight`/`hitSlop` uses against ~378 `Pressable`s.                                                                    | grep                                                                         | `accessibility` §5 (24×24 min)     | Verify by measuring                 |
| F15 | Keyboard inset uses `visualViewport` plus a 60 ms timeout; works, but `interactive-widget` viewport behaviour may remove the code.                                                          | `use-keyboard-inset.web.ts`                                                  | `form-factor-adaptation`           | Low, optional                       |

Checked, no gap: `lang` and `<title>` present; `viewport-fit=cover` and `env(safe-area-inset-*)` used; `100dvh` with a fallback; dark `color-scheme` on `html` and scrollbars; `body` overscroll and scroll lock; live regions on status text and the drive banner (`role=alert`); blob-URL download with delayed revoke; Escape stack closes the topmost layer only.

## Outcome of reproducing the "verify" findings (task 1.2)

Each was reproduced as a scenario on the export built from this branch before any fix.

| #   | Result                                                                                                                 | Scenario                                                         | Next           |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------- |
| F3  | Confirmed: the dismiss backdrop is an unnamed button. The dialog role, name and `aria-modal` are present.              | `overlay-accessibility` (fails)                                  | 3.1            |
| F4  | Not a gap: focus moves in, Tab stays inside, and focus returns to the opener, for keyboard- and pointer-opened sheets. | `overlay-accessibility` (passing steps)                          | none; guard    |
| F5  | Escape: not a gap, one press closes the topmost layer only. Back: confirmed, it leaves the app with a sheet open.      | `overlay-escape-layers` (passes), `overlay-back-gesture` (fails) | 3.3 (decision) |
| F6  | Confirmed: opening a sheet runs an animation under `prefers-reduced-motion: reduce`.                                   | `reduced-motion` (fails)                                         | 3.4            |
| F7  | Not a gap for the shell's first eight keyboard stops. Other surfaces are unchecked.                                    | `forced-colors` (passes)                                         | none; guard    |
| F11 | Not a gap: the window opens with `noopener`.                                                                           | `external-link-opener` (passes)                                  | none; guard    |
| F14 | Not a gap on the library, a track menu and the playback view.                                                          | `target-sizes` (passes)                                          | none; guard    |

F1, F2 were reproduced by `web-document-metadata`. F13 was checked by reading the `react-native-track-player` web source (no `mediaSession`), then fixed with `media-session` written alongside the fix.

## Changes on main since the audit

- **Pane drag and reduced motion (#72, #74).** `useReduceMotion` is now also read where the playback sheet slides in under a drag, and the drag handles only the primary pointer and uses `touch-action: none`. F6 narrows: motion in the playback surface and pane drag already respects the preference; the gap is the remaining shared `Modal` transitions and the other animation sites. Task 3.4 must reuse `useReduceMotion` and not add a second mechanism.
- **Page scroll guard (#75, `usePageScrollGuard`).** The home-screen web app on iOS could leave the page shifted from the top; the body is `overflow: hidden`, so it could not be scrolled back. The guard resets scroll to 0, 0 on scroll, resize, orientation change, page show and visibility change, except while a text field has focus. This is a defensive fix for a cause not confirmed on a device. It bears on this change in two ways: the manifest (F2) with `display: standalone` makes that installed mode the default for installs, so the guard becomes more important, and any viewport or keyboard change (F15) must keep the "not while editing" exception. No new finding, but a new regression risk, listed below.
- Nothing else on main (clipboard copy, the pane handle direction, the agent skill install) touches the audited surfaces.

## Decisions

- **Verify before fixing** for F4–F6, F11, F13, F14: each gets a scenario that asserts the intended behaviour. If it already passes it is kept as a regression guard and no code changes.
- **Manifest and metadata** are static files plus `app.config.ts` entries (`web.name`, `shortName`, `themeColor`, `backgroundColor`, `display: standalone`, icons), with the `id` set so the identity survives a base-path change. The GitHub Pages base path (`EXPO_BASE_URL`) must be reflected in `start_url`/`scope`; a scenario checks the built export resolves them.
- **CSP** is meta-delivered and starts in an allowlist built from the hosts the network guard already declares for scenarios (Google auth/Drive/lyrics lookup). The meta policy ships only after the full scenario set passes under it; `frame-ancestors` is not supported in meta and is listed as out of scope.
- **Token storage (F9)** is decided in review, not assumed: options are keep with CSP as mitigation, move to `sessionStorage`, or hold in memory only (forces re-consent on reload). Recommendation: keep `localStorage` plus CSP, because Drive reconnect already needs a user tap; revisit if the CSP cannot be made strict.
- **Persistent storage** is requested once on first offline save and the result is shown in the existing storage UI; denial is not an error.
- **Wake lock and media session** are optional, behind capability checks, released on `visibilitychange`, and out of scope if the product owner declines. They are separate task groups so they can be dropped.
- **No new runtime dependencies.** Web-only code stays in `.web` siblings; the model/DOM split follows the existing `.web.ts` + spec pattern.

## Risks

- The manifest and standalone display change how iOS and Android launch the app. The `page-scroll-guard` and `landscape-pane-expand` scenarios, and a manifest-installed standalone run if the browser can emulate it, must still pass; if the shifted-page gap persists on a device, record whether it follows rotation, toolbar or keyboard, as the guard's task note asks.

- A strict meta CSP can break Expo's inline bootstrap script; the scenario run under the CSP is the check, and the CSP can ship in report-only form first (not possible via meta, so it is gated on the scenarios instead).
- Focus trapping inside RN `Modal` portals is platform-sensitive; WebKit and Firefox runs are part of the verification.
- Reduced motion changes must not alter test timings in the default lane.

## Verification and merge gate

Every task group ends with its scenario(s) in `tools/browser-session/`, run several times to rule out flakiness. Before merge, a maintainer MUST run and pass, on the PR branch:

1. `npm exec -- nx run-many -t lint test typecheck build --all`
2. `npm exec -- nx run mobile-rehearsal-player:browser-test`
3. `npm exec -- nx run mobile-rehearsal-player:browser-test-matrix` (the full matrix: device profiles, CPU throttle, sample rates, long tracks), including the WebKit and Firefox dispatches of `browser-matrix.yml` for the overlay and focus work.

The matrix lane is not run by default CI; add the `browser-matrix` label to the PR (or dispatch the workflow) and confirm it is green. A PR that has not passed it must not be merged.
