## 1. Decision and architecture baseline

- [ ] 1.1 Inventory mobile app modules and classify them as platform-agnostic shared core vs platform-specific adapters.
- [ ] 1.2 Run an implementation spike comparing Expo web and dedicated React client viability for auth, playback, routing, and reuse.
- [ ] 1.3 Record the chosen path and acceptance criteria in the change artifacts before implementation begins.

## 2. Shared-core extraction

- [ ] 2.1 Extract reusable domain/view-model logic from the mobile app into shared workspace packages where needed.
- [ ] 2.2 Preserve existing mobile behavior by adapting mobile app imports to the new shared package boundaries.
- [ ] 2.3 Add or update automated tests around extracted shared logic to prevent platform drift.

## 3. Web client foundation

- [ ] 3.1 Create and configure the selected web client shell (Expo web surface or dedicated React app) in `packages/`.
- [ ] 3.2 Implement web authentication entry/callback handling for Google Drive access.
- [ ] 3.3 Wire Drive browse/search and saved-library flows in the web shell using shared-core modules.

## 4. Rehearsal workflows and validation

- [ ] 4.1 Implement loop and playlist workflows in the web client with shared queue semantics.
- [ ] 4.2 Implement web playback controls and state handling consistent with requirement-level behavior.
- [ ] 4.3 Validate capability parity through automated tests and a manual cross-platform checklist.
