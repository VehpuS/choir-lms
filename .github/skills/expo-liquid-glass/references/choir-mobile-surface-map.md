# Choir Mobile Surface Map

Start from the nearest surface that actually controls the visuals.

## Shell and Navigation

- `packages/mobile-rehearsal-player/src/app/routing/shell/mobile-shell/index.tsx`
- `packages/mobile-rehearsal-player/src/app/routing/shell/shell-tab-bar.tsx`
- `packages/mobile-rehearsal-player/src/app/routing/shell/mobile-shell-styles.ts`

Use for the shared header, bottom dock, mini-player, and tab bar.

## Playback Surfaces

- `packages/mobile-rehearsal-player/src/app/routing/playback/playback-surface.tsx`
- `packages/mobile-rehearsal-player/src/app/routing/playback/playback-surface-content.tsx`
- `packages/mobile-rehearsal-player/src/app/routing/playback/playback-control-cards.tsx`
- `packages/mobile-rehearsal-player/src/app/routing/playback/playback-session-mode-card.tsx`

Use for the sheet frame, transport controls, volume card, queue controls, and content layering.

## Modal and Editor Surfaces

- `packages/mobile-rehearsal-player/src/app/library/loops/components/loop-range-selector-surface/index.tsx`
- `packages/mobile-rehearsal-player/src/app/library/playlists/components/saved-track-playlist-menu-surface.tsx`

Use for sheet framing and action grouping. Keep the form-heavy inner content readable.

## Content Surfaces Usually Left Opaque

- `packages/mobile-rehearsal-player/src/app/screens/recents/index.tsx`
- `packages/mobile-rehearsal-player/src/app/library/drive/components/drive-discovery-panel.tsx`
- `packages/mobile-rehearsal-player/src/app/library/drive/components/drive-search-results-panel.tsx`
- `packages/mobile-rehearsal-player/src/app/library/components/saved-rehearsal-library-section/index.tsx`

These are better starting points for spacing, hierarchy, and card polish than for glass.
