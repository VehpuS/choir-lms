---
name: ci-workflow-maintenance
description: Maintain GitHub Actions CI for this Nx + Expo monorepo when installs or CI targets fail. USE WHEN user mentions ci.yml, GitHub Actions failures, npm ci failures, target not found, or wants CI hardening for Nx/Expo without Nx Cloud.
---

# CI Workflow Maintenance (Nx + Expo, No Nx Cloud)

Use this skill to keep `.github/workflows/ci.yml` reliable for this repository.

## Repository Rules

- This workspace uses npm workspaces and a root lockfile.
- Run Nx through npm: `npm exec -- nx ...`.
- Do not use Nx Cloud commands unless Nx Cloud is configured in `nx.json`.
- The mobile app is Expo-based and should avoid device/simulator targets in Linux CI.

## Fast Triage Checklist

1. Reproduce install locally from repo root with `npm ci`.
2. Verify Node/npm parity with CI (`node --version`, `npm --version`).
3. Confirm CI targets exist before running them:
   - `npm exec -- nx show projects --withTarget=lint`
   - `npm exec -- nx show projects --withTarget=test`
   - `npm exec -- nx show projects --withTarget=build`
   - `npm exec -- nx show projects --withTarget=typecheck`
4. If a target is missing (for example `e2e-ci`), remove it from generic `run-many` calls or add the target to projects.

## Workflow Patterns

- Pull requests:
  - `npm exec -- nx format:check --base=origin/main --head=HEAD`
  - `npm exec -- nx affected -t lint test build typecheck --base=origin/main --head=HEAD --outputStyle=static`
- Push to main:
  - `npm exec -- nx run-many -t lint test build typecheck --all --outputStyle=static`

## Expo Guardrails

- Avoid `expo run:ios` / `expo run:android` in Ubuntu CI.
- Prefer static validation and export/build targets already wired in Nx project configuration.
- Keep `CI=true` behavior non-interactive.

## No-Nx-Cloud Guardrails

Only use these commands when Nx Cloud is configured:

- `nx start-ci-run`
- `nx record`
- `nx fix-ci`

If Nx Cloud is not configured, remove those steps from CI workflows.
