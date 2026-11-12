## Summary

OpenSpec change `web-platform-modernization`: an audit of the web export against modern-web-guidance, with a findings table (F1–F15), a proposal, design, spec and tasks. Docs only; no app code changes yet.

## Required before merge (maintainers)

The implementation of this change touches shared shell, overlay and playback surfaces. Before merging, **run the full browser matrix and confirm it passes** on the latest commit:

- [ ] `npm exec -- nx run-many -t lint test typecheck build --all`
- [ ] `npm exec -- nx run mobile-rehearsal-player:browser-test`
- [ ] `npm exec -- nx run mobile-rehearsal-player:browser-test-matrix` (full matrix; not run by default CI, so add the `browser-matrix` label or dispatch `browser-matrix.yml`, including WebKit and Firefox for overlay/focus work)

Do not merge until all three pass.

## Notes

The audit was a static read; "Verify" findings start as scenarios and are fixed only if they fail.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_014tSdMQLyRSjqkxCrdGAYEd
