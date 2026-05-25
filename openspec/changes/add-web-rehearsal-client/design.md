## Context

The repository currently implements a mobile rehearsal player with shared domain packages and Google Drive-backed source discovery. A web version is now needed, but the team must decide whether to extend the Expo app to web or stand up a dedicated React web app that reuses shared logic. The decision should prioritize delivery speed without compromising long-term maintainability or platform-specific playback quality.

## Goals / Non-Goals

**Goals:**

- Deliver a browser-accessible rehearsal client for the current MVP feature set where practical.
- Keep rehearsal domain behavior (saved tracks, loops, playlists, queue semantics) platform-consistent through shared packages.
- Make a deliberate implementation-path decision (Expo web first or dedicated React client) with explicit acceptance criteria.
- Avoid blocking in-flight mobile queue/native playback milestones while enabling incremental web delivery.

**Non-Goals:**

- Achieving native-parity media controls on web where browser capabilities differ.
- Designing a conductor/admin web suite beyond the rehearsal-player slice.
- Expanding MVP scope into offline sync, collaborative editing, or non-audio learning tools.

## Decisions

### 1. Start with a shared-core, dual-surface architecture

Platform-independent domain and application logic will live in reusable workspace libraries, while client apps own platform-specific routing, playback adapter integration, and UX composition.

Alternatives considered:

- Keep logic in the existing mobile app and reuse ad hoc: rejected because it increases coupling and slows web delivery.
- Full rewrite for web: rejected because it duplicates business logic and raises regression risk.

### 2. Gate client-path selection behind an implementation spike with explicit criteria

The team will run a short spike comparing Expo web and a dedicated React client for:

- authentication feasibility for Google Drive flows,
- playback reliability for supported rehearsal formats,
- routing and destination-shell ergonomics,
- effort to reuse existing view-model and domain modules.

The spike outcome will set one of two paths as the default implementation path for the first web MVP.

Alternatives considered:

- Pick Expo web immediately: rejected because unresolved playback/auth constraints may force rework.
- Pick dedicated React immediately: rejected because Expo web may be sufficient for MVP at lower cost.

### 3. Preserve capability semantics across platforms, allow UI divergence

Requirement-level behavior for library, loops, playlists, and queue control remains shared. Mobile and web can differ in layout, navigation details, and platform affordances as long as the behavioral contract is preserved.

Alternatives considered:

- Require pixel-parity UI: rejected because form factors and input models differ.

## Architecture

- **Shared packages**: domain models, Drive data mapping, saved-library state logic, loop/playlist queue helpers, and platform-agnostic view-model utilities.
- **Platform adapters**:
  - mobile adapter continues to use native-focused playback and transport surfaces;
  - web adapter provides browser playback/session abstractions and web-auth callback handling.
- **Client shell**:
  - either Expo-web-rendered shell from current app, or
  - a dedicated React web app in `packages/` reusing shared packages.

## Risks / Trade-offs

Identified risks to validate during implementation:

- [Browser playback constraints differ by device and browser] → Validate formats, seek precision, and background/tab behavior early in the spike.
- [OAuth behavior differs between native and browser redirect flows] → Define explicit web callback and token-lifecycle handling before feature completion.
- [Shared-core extraction may temporarily slow feature throughput] → Prioritize extracting high-reuse modules first and defer low-value refactors.
- [Two surfaces may drift functionally] → Use capability-level acceptance criteria and shared tests where possible.

## Migration Plan

1. Identify and extract platform-agnostic modules currently embedded in the mobile app.
2. Run the Expo-web vs React-client spike and record the selected path.
3. Create or wire the chosen web client shell in `packages/`.
4. Implement shared auth, Drive library, saved library, loop, and playlist flows on web using shared-core modules.
5. Add cross-platform validation for capability contracts and platform-specific smoke checks.

## Open Questions

- Which browsers/devices are required for MVP support?
- Is web playback expected to continue when the tab is backgrounded, or is active-tab playback acceptable for MVP?
- Should web sign-in reuse the same OAuth client configuration strategy or use dedicated web credentials per environment?
