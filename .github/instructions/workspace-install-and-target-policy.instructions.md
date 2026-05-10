---
description: 'Use when changing workspace manifests or Nx config. Apply the numbered rules below in order.'
applyTo: '**/{package.json,package-lock.json,nx.json}'
---

# Workspace Install And Target Policy

1. Lockfile sync: Treat workspace manifest edits and lockfile edits as a single change or commit. When dependencies, workspaces, overrides, or target-affecting package metadata change, regenerate the committed root `package-lock.json` in the same change instead of leaving uncommitted or mismatched dependency changes for later.
2. Install validation: After touching a manifest or the lockfile, run `npm ci` before finishing whenever the change could affect installation or dependency resolution.
3. CI-safe targets: First, when package or Nx config changes affect targets used by CI, keep the default `build`, `test`, `lint`, and `typecheck` targets locally runnable and producing consistent outputs without relying on external services. Avoid making a default CI target depend on remote services, global-only CLIs, interactive prompts, or machine-specific setup unless the workflow explicitly provisions them.
4. Explicit remote flows: Next, if a project still needs a remote or credentialed variant, expose it under an explicit target name that signals the behavior, such as `eas-build`, instead of overloading the default `build` target.
5. Expo default builds: Then, do not use `@nx/expo:build` as the default CI `build` target unless the workflow explicitly provisions EAS. Prefer a local default build and keep remote EAS builds on an explicit target such as `eas-build`.
6. Validation alignment: Finally, after changing manifests or target wiring, run the local command for the specific affected CI step before finishing. In this workspace, that usually means running the touched `build`, `test`, `lint`, or `typecheck` target through Nx with the workspace package manager. Widen only if that direct check is inconclusive.
