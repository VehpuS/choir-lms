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

OpenSpec workflow:

```sh
openspec list --json
openspec status --change "add-mobile-rehearsal-player"
```

## Status

The repository is still in early setup. The product direction and first implementation slice are defined in OpenSpec, and the next step is implementation of the mobile rehearsal player foundations.
