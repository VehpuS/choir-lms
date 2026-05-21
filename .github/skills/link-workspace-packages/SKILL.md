---
name: link-workspace-packages
description: 'Link workspace packages in this npm workspace. USE WHEN: (1) you just created or generated new packages and need to wire up their dependencies, (2) user imports from a sibling package and needs to add it as a dependency, (3) you get resolution errors for workspace packages (@org/*) like "cannot find module", "failed to resolve import", "TS2307", or "cannot resolve". DO NOT patch around with tsconfig paths or manual package.json edits - use npm workspace commands to fix actual linking.'
---

# Link Workspace Packages

Add dependencies between packages in this npm workspace.

## Confirm Workspace Context

Check the root `package.json` for a `packageManager` field and confirm the committed root `package-lock.json` is present.

## Workflow

1. Identify consumer package (the one importing)
2. Identify provider package(s) (being imported)
3. Add dependency using npm's workspace syntax
4. Verify symlinks created in consumer's `node_modules/`

---

## npm

npm links local workspace packages during install when the dependency name matches another workspace package.

```bash
# From the workspace root
npm install @org/ui --workspace @org/app

# Or from inside the consumer package directory
npm install @org/ui
```

Result in `package.json`:

```json
{ "dependencies": { "@org/ui": "^0.0.1" } }
```

npm usually saves the current workspace package version range and resolves it to the local workspace during install.

---

## Examples

**Example 1: Link ui lib to app**

```bash
npm install @org/ui --workspace @org/app
```

**Example 2: npm - link multiple packages**

```bash
npm install @org/data-access @org/ui --workspace @org/dashboard
```

**Example 3: Debug "Cannot find module"**

1. Check if dependency is declared in consumer's `package.json`
2. If not, add it using appropriate command above
3. Run `npm install` at the workspace root

## Notes

- Symlinks appear in `<consumer>/node_modules/@org/<package>`
- npm workspaces hoist shared dependencies to the root `node_modules` by default, so each package should still declare its direct dependencies explicitly.
- Root `package.json` should have `"private": true` to prevent accidental publish
