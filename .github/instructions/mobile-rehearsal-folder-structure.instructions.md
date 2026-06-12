---
description: 'Use when adding, moving, renaming, or reorganizing TypeScript and TSX files in the mobile rehearsal player. Keep Expo-inspired folder structure, explicit feature ownership, and consistent naming in packages/mobile-rehearsal-player/src.'
applyTo: 'packages/mobile-rehearsal-player/src/**/*.{ts,tsx}'
---

# Mobile Rehearsal Player Folder Structure

- Base layout: Keep app code in `packages/mobile-rehearsal-player/src/`. Keep runtime or config-only files in `src/config/`.
- Current architecture: This app uses `src/app/App.tsx` and `src/app/routing/AppRouter.tsx`, not Expo Router file-based routes. Keep routing and shell files thin and move screen or surface implementation details out of router entry points when they grow.
- Naming: Prefer kebab-case for new file and folder names. Keep React component exports PascalCase. For ordinary feature work, avoid unrelated rename churn outside the touched area. When the user explicitly requests a standardization or cleanup pass, rename legacy files and update legacy code within the targeted surface to match the convention.
- Shared vs local: Put code in `src/app/components/` only when it is reused across multiple features. Otherwise keep it inside the owning feature or surface.
- Screen boundaries: Keep screen composition in `src/app/screens/`. When a screen grows beyond one file, move it into a dedicated folder such as `screens/recents/` with a stable entry file like `index.tsx`.
- Surface boundaries: Avoid adding more unrelated siblings to already flat directories like `src/app/routing/`, `src/app/library/components/`, and `src/app/library/utils/`. Prefer grouping by user-facing surface or domain such as playback, queue, recents, drive, playlists, loops, or search.
- Component folders: When a component or surface splits into multiple files, create a folder and keep the public entry in `index.tsx` or `index.ts` so import paths can stay stable while helpers and subcomponents are colocated.
- Styles: Keep styles in the component file by default. Extract a separate style module only when multiple nearby files genuinely share it.
- Tests: Use colocated kebab-case `*.spec.ts` or `*.spec.tsx` files for mobile coverage under `src/**`. Do not introduce `*.test.*` files or new `__tests__` directories in the mobile app. When you are already reorganizing a legacy surface, migrate its tests toward colocated `*.spec.*` files. The `mobile-rehearsal-player:test` and `typecheck-tests` targets discover `*.spec.*` files automatically.
- Platform files: Use `.ios`, `.android`, `.native`, or `.web` siblings when platform implementations diverge materially, while keeping the same public API.
- Refactors: Group files by feature ownership rather than by file type alone. Prefer structural changes that materially improve legibility, even when they are broader, and avoid slow incremental cleanup that leaves ownership ambiguous. In an explicit standardization pass, broader cleanup across the targeted surface is expected.
