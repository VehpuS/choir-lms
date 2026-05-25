## Why

The current product slice is mobile-first, but choirs also need browser-based access for desktop rehearsal, quick link-based onboarding, and lower-friction evaluation by directors who may not install a native app first. Without an intentional web strategy, the platform risks duplicating logic later or shipping inconsistent behavior between clients.

## What Changes

- Introduce a web client change that defines how the rehearsal player experience is delivered in browsers.
- Evaluate two implementation paths for the first web slice:
  - Expo web from the existing mobile app surface.
  - A React web client that shares domain and integration logic from workspace libraries.
- Establish platform-shared boundaries for domain models, Drive discovery, saved library behavior, loops, playlists, and queue semantics so web and mobile remain behaviorally aligned.
- Define web-specific UX constraints for authentication flow, playback support, and browser-oriented navigation while preserving the rehearsal-first product direction.
- Stage implementation to deliver a functional web MVP without blocking remaining mobile playback milestones.

## Capabilities

### New Capabilities

- `web-rehearsal-client`: Access the rehearsal library and playback workflows from a supported browser surface.

### Modified Capabilities

- `mobile-practice-library`: Becomes platform-shared practice-library behavior with platform-specific presentation and playback adapters.
- `practice-loops-and-playlists`: Becomes platform-shared loop, playlist, and queue behavior across mobile and web clients.

## Impact

- Adds a second product surface and requires explicit cross-platform architecture decisions in the Nx workspace.
- Requires a shared-core approach for rehearsal domain logic to avoid divergent mobile and web behavior.
- Requires browser compatibility decisions for Google authentication and audio playback integrations that differ from native mobile transport surfaces.
- Keeps the roadmap open for either Expo-web-first delivery or a dedicated React web shell, with a formal decision and migration path documented before implementation.
