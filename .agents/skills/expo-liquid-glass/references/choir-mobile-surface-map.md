# Choir Mobile Surface Map

Start from the nearest surface that actually controls the visuals.

## Shell and Navigation

- `packages/mobile-rehearsal-player/src/app/routing/MobileShell.tsx`
- `packages/mobile-rehearsal-player/src/app/routing/ShellTabBar.tsx`
- `packages/mobile-rehearsal-player/src/app/routing/mobile-shell-styles.ts`

Use for the shared header, bottom dock, mini-player, and tab bar.

## Playback Surfaces

- `packages/mobile-rehearsal-player/src/app/routing/PlaybackSurface.tsx`
- `packages/mobile-rehearsal-player/src/app/routing/PlaybackSurfaceContent.tsx`
- `packages/mobile-rehearsal-player/src/app/routing/PlaybackControlCards.tsx`
- `packages/mobile-rehearsal-player/src/app/routing/PlaybackSessionModeCard.tsx`

Use for the sheet frame, transport controls, volume card, queue controls, and content layering.

## Modal and Editor Surfaces

- `packages/mobile-rehearsal-player/src/app/library/components/LoopRangeSelectorSurface.tsx`
- `packages/mobile-rehearsal-player/src/app/library/components/SavedTrackPlaylistMenuSurface.tsx`

Use for sheet framing and action grouping. Keep the form-heavy inner content readable.

## Content Surfaces Usually Left Opaque

- `packages/mobile-rehearsal-player/src/app/screens/HomeScreen.tsx`
- `packages/mobile-rehearsal-player/src/app/library/components/DriveDiscoveryPanel.tsx`
- `packages/mobile-rehearsal-player/src/app/library/components/DriveSearchResultsPanel.tsx`
- `packages/mobile-rehearsal-player/src/app/library/components/SavedRehearsalLibrarySection.tsx`

These are better starting points for spacing, hierarchy, and card polish than for glass.
