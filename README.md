# Choir LMS

Choir LMS is an Nx-based monorepo for building a suite of tools that help choirs organize learning materials and make rehearsal preparation more effective.

The long-term goal is a broader choir learning platform that can bring together storage integrations, rehearsal materials, collaboration workflows, and role-specific tools for singers, section leaders, and directors. The first product slice is narrower by design: a mobile rehearsal player that turns shared audio into repeatable personal practice sessions.

## Vision

Choirs often already have the raw material they need for self-rehearsal, but it is scattered across shared drives, folders, and messages. This project aims to add a rehearsal-focused layer on top of those existing assets so choir members can spend less time searching and more time practicing.

At a high level, the platform is intended to support:

- integration with existing storage systems, starting with Google Drive
- audio, document, schedule, and rehearsal material access from a unified product surface
- practice-specific workflows such as saved loops, playlists, annotations, and guided rehearsal content
- future expansion into broader choir operations and learning workflows

## First Product Slice

The current focus is a mobile-first rehearsal player built with React and intended for native-feeling mobile playback.

For the MVP, the player is expected to support:

- browsing and playing audio files from Google Drive
- marking start and end points on a track and saving them as named loops
- adding full tracks and saved loops into playlists
- ordered playback, repeat, and shuffle for rehearsal sessions
- native mobile transport integration where practical, including background playback and lock-screen controls

The MVP explicitly does not include offline playback, document collaboration, score annotation, recording overlays, or broader rehearsal management workflows.

## Product Direction

This repository is intentionally scaffolded as an Nx workspace rather than a single app so the system can grow into a library of apps and shared packages over time.

The expected shape is:

- one or more user-facing applications under `packages/`
- shared domain and integration packages for media, storage, auth, and choir-specific workflows
- OpenSpec-driven change proposals to keep product scope and implementation aligned as the platform expands

The first change proposal for this direction is `add-mobile-rehearsal-player` under `openspec/changes/`.

## Repository Notes

- `packages/` is the workspace home for future apps and shared libraries
- `openspec/` contains proposals, designs, specs, and tasks for planned work
- `nx.json` and the root TypeScript configuration provide workspace-level build and project settings

## Development

This workspace uses npm workspaces with the committed root `package-lock.json`.
Prefer `npm exec -- <tool>` for local CLIs, especially `npm exec -- nx ...` for
workspace tasks.

Useful Nx commands:

```sh
npm exec -- nx show projects
npm exec -- nx graph
npm exec -- nx sync
```

### Google OAuth for mobile manual testing

The mobile rehearsal player reads Google Drive OAuth IDs from `packages/mobile-rehearsal-player/.env`.

For the default app identifiers in this repo:

- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` should be an iOS OAuth client for bundle ID `com.choirlms.mobile`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` should be an Android OAuth client for package `com.choirlms.mobile`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is only needed when running the app on web

To get the Android debug SHA-1 for local `expo run:android` builds:

```sh
keytool -list -v -alias androiddebugkey -keystore ~/.android/debug.keystore -storepass android -keypass android | grep SHA1
```

If `~/.android/debug.keystore` does not exist yet, generate the standard Android debug keystore first:

```sh
keytool -genkeypair -v -keystore ~/.android/debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
```

After filling the client ID for the platform you are testing, verify the Expo config and launch a dev build:

```sh
cd packages/mobile-rehearsal-player
npm exec -- expo config --type public
```

```sh
npm exec -- nx run mobile-rehearsal-player:run-ios
# or
npm exec -- nx run mobile-rehearsal-player:run-android
```

For deterministic local and CI validation, `npm exec -- nx run mobile-rehearsal-player:build` performs a local Expo export. Use `npm exec -- nx run mobile-rehearsal-player:eas-build` when you intentionally want to trigger an EAS build.

### GitHub Pages deployment

The repository includes [.github/workflows/deploy-mobile-web-pages.yml](.github/workflows/deploy-mobile-web-pages.yml) to export and deploy the mobile web app to GitHub Pages automatically after the `CI` workflow succeeds for `main`, and it can also be run manually with a `ref` input through `workflow_dispatch`.

Before the workflow can publish, enable GitHub Pages for the repository and set the build source to GitHub Actions in the repository settings.

The workflow reads the configured Pages base path from GitHub and passes it to Expo as `EXPO_BASE_URL`, so project sites such as `https://vehpus.github.io/choir-lms/` and custom domains export the correct asset URLs.

For Google Drive sign-in to work in the deployed web build, add repository variables for `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`. The workflow also reads optional repository variables for `EXPO_PUBLIC_APP_SCHEME`, `EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER`, `EXPO_PUBLIC_ANDROID_PACKAGE`, `EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_MIME_TYPES`, and `EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_EXTENSIONS`.

Do not add `GOOGLE_WEB_CLIENT_SECRET` to the repository or workflow for this frontend-only deployment.

To preview the same path handling locally for the current repository URL shape:

```sh
EXPO_BASE_URL=/choir-lms npm exec -- nx run mobile-rehearsal-player:build
```

OpenSpec workflow:

```sh
openspec list --json
openspec status --change "add-mobile-rehearsal-player"
```

### Agentic OpenSpec workflow:

- repo-level policy lives in `AGENTS.md`
- OpenSpec change artifacts auto-load additional guidance from `.github/instructions/openspec-deliberate-execution.instructions.md`
- `openspec-checkpointed-implementation` runs the one-subtask execution loop
- `implementation-checkpoint` handles the validated pause for feedback, manual verification, and commit decisions

### Workspace agent skills

The repo carries workspace-local GitHub Copilot skills under `.github/skills/`
with mirrored agent copies under `.agents/skills/` for repeated mobile design
and implementation work:

- `mobile-folder-structure` for Expo-inspired naming and folder-organization work in `packages/mobile-rehearsal-player`, especially when reducing flat directories or grouping files by feature ownership
- `expo-liquid-glass` for guarded glass or translucent UI work in the mobile shell, mini-player, playback sheet, and modal surfaces
- `design-audit` for phased UI and UX audits of the mobile rehearsal player before broader visual refactors
- `apple-hig-ios` and `music-ui-iconography` for iOS pattern decisions and playback icon semantics

## Status

The repository is still in early setup. The product direction and first implementation slice are defined in OpenSpec, and the next step is implementation of the mobile rehearsal player foundations.
