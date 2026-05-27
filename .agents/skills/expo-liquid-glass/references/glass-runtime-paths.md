# Glass Runtime Paths

Choose the smallest path that satisfies the task.

## Path 1: Guarded `expo-glass-effect`

Use for iOS-first navigation chrome when the task specifically wants native-feeling glass.

- Best targets: shell dock, mini-player frame, compact playback toolbar.
- Requires runtime availability checks.
- Usually requires a dev build.

## Path 2: `expo-blur`

Use when the UI needs translucency now and native glass is not a hard requirement.

- Good for previewing shell treatments in Expo Go.
- Good cross-platform fallback.
- Pair with a defined fallback background color.

## Path 3: `@expo/ui` SwiftUI

Use only when the task needs advanced iOS-only transitions or coordinated native presentation behavior.

- Not the default path for this repo.
- Best reserved for deliberate iOS-native upgrades to shell or sheet choreography.

## Path 4: Plain React Native translucency

Use when the task is mostly compositional and the current architecture should remain dependency-light.

- Works for small polish passes.
- Should still preserve the same grouping, contrast, and spacing rules as true glass.

## Decision Heuristic

- If the surface is structural chrome and the task is iOS-first, start with Path 1.
- If the task must also work in Expo Go, start with Path 2.
- If the task is only about polish within the current styles, start with Path 4.
- If the request explicitly mentions SwiftUI or advanced native transitions, consider Path 3.
