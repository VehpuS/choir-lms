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

Useful Nx commands:

```sh
npx nx show projects
npx nx graph
npx nx sync
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
npx expo config --type public
```

```sh
npm exec -- nx run mobile-rehearsal-player:run-ios
# or
npm exec -- nx run mobile-rehearsal-player:run-android
```

OpenSpec workflow:

```sh
openspec list --json
openspec status --change "add-mobile-rehearsal-player"
```

### Agentic OpenSpec workflow:

- repo-level policy lives in `AGENTS.md`
- OpenSpec change artifacts auto-load additional guidance from `.github/instructions/openspec-deliberate-execution.instructions.md`
- automated test work follows `.github/instructions/testing-policy.instructions.md`; agents should add missing test tooling instead of skipping coverage when the touched surface lacks a usable harness
- `openspec-checkpointed-implementation` keeps implementation scoped to one numbered subtask at a time
- `implementation-checkpoint` pauses for feedback, manual verification, and an optional commit before the next subtask
- new behavior should add automated tests in the same slice unless the user explicitly accepts a documented manual-only gap

## Status

The repository is still in early setup. The product direction and first implementation slice are defined in OpenSpec, and the next step is implementation of the mobile rehearsal player foundations.
