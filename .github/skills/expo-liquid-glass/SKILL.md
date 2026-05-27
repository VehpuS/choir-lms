---
name: expo-liquid-glass
description: >
  Design and implement Liquid Glass interfaces for the Expo-based mobile
  rehearsal player in this repo. Use when tasks mention "liquid glass",
  "glass effect", "frosted" or "translucent UI", or when editing the shared
  shell, tab bar, mini-player, playback sheet, loop builder, or playlist menus
  in packages/mobile-rehearsal-player and the work needs guarded native paths,
  Expo-friendly fallbacks, Apple HIG alignment, and accessibility checks.
---

# Expo Liquid Glass for Choir LMS

Ship glass-like UI that feels native, stays legible, and degrades safely inside
`packages/mobile-rehearsal-player`.

This skill is for UI work in the current app architecture, which uses a custom
`MobileShell` and custom sheet surfaces rather than `expo-router` native tabs.

## Execution Order

1. Confirm runtime constraints and whether the target surface is iOS-only or cross-platform.
2. Decide whether the surface is navigation chrome, a transient control surface, or primary content.
3. Choose one primary implementation path and one explicit fallback.
4. Check Apple-style composition rules before touching colors, blur, or motion.
5. Implement guarded glass surfaces without breaking the current shell layout.
6. Verify accessibility, contrast, and touch behavior in both glass and fallback modes.

## 1) Preflight Constraints

- Reserve glass for navigation chrome, transient controls, and sheet framing. In this app that usually means the bottom dock, mini-player, header accessories, playback sheet frame, or modal headers.
- Keep dense rehearsal content readable. Discovery cards, library rows, playlist items, and status panels should normally stay opaque or only lightly translucent.
- The current app uses a custom shell in `src/app/routing/MobileShell.tsx` and `src/app/routing/ShellTabBar.tsx`. Treat a switch to native tabs or router-driven navigation as a scope change, not a styling tweak.
- If the task must work in Expo Go, prefer `expo-blur` or plain translucent fallback views. Advanced iOS-native glass should assume a dev build.
- Check the current Expo SDK docs before finalizing API syntax if the task adds or upgrades a glass-related dependency.
- Keep new glass code isolated behind a wrapper component so non-glass fallback behavior is explicit and testable.

## 2) Design Alignment

Before implementing visuals, check these buckets:

1. Foundations
   Material, color, contrast, elevation, spacing, and motion.
2. Patterns
   Shell navigation, mini-player attachment, sheet presentation, and modal framing.
3. Components
   Tab items, playback controls, queue pills, sliders, menu buttons, and status chips.
4. Inputs
   Touch targets, press states, drag gestures, Reduce Transparency, and Reduce Motion.

Load `references/apple-liquid-glass-design.md` for the design rules and
`references/choir-mobile-surface-map.md` for the current app surfaces.

## 3) Choose the Primary Path

| Path                                    | Use it for                                                                          | Tradeoffs                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Guarded `expo-glass-effect`             | iOS-first shell chrome, floating accessory bars, grouped control clusters           | Best match for true glass; requires runtime guards and usually a dev build |
| `expo-blur` fallback                    | Expo Go previews, cross-platform translucent bars, safer first pass                 | Easier to ship, but flatter and less adaptive than native glass            |
| `@expo/ui` SwiftUI composition          | Coordinated iOS-only glass transitions or highly native sheet/tab choreography      | Useful only when SwiftUI-specific behavior is the real requirement         |
| Custom translucent React Native surface | Preserve current architecture and theme when native glass is unnecessary or blocked | Lowest risk, but this is visual translucency, not real system glass        |

Default to a single path. Add a second path only when the runtime split is
material to the user experience.

## 4) Apple-Style Design Rules

Apply these before code:

1. Put hierarchy in spacing and grouping, not in stacked borders, shadows, and tints.
2. Let content run behind glass when the surface is navigational. Glass looks flat over blank backgrounds.
3. Use shared glass clusters for related controls. Do not scatter isolated translucent pills everywhere.
4. Keep body copy and dense list content on solid surfaces unless a specific design reason justifies translucency.
5. Push bold color into the content or background image, not into the glass chrome.
6. Preserve recognizable transport semantics and tab semantics already documented in `apple-hig-ios` and `music-ui-iconography`.
7. Avoid full-screen glass sheets for the rehearsal content itself. A glass frame around an opaque content card is usually the better pattern here.

## 5) Implementation Patterns

### Pattern A: Adaptive Glass Wrapper

Use a single wrapper component for runtime guards and fallbacks.

```tsx
import { Platform, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';

export const AdaptiveGlassSurface = ({ children, style }) => {
  if (Platform.OS === 'ios' && isGlassEffectAPIAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" style={style}>
        {children}
      </GlassView>
    );
  }

  if (Platform.OS !== 'web') {
    return (
      <BlurView intensity={32} style={style} tint="light">
        {children}
      </BlurView>
    );
  }

  return (
    <View style={[style, { backgroundColor: 'rgba(255,253,248,0.88)' }]}>
      {children}
    </View>
  );
};
```

### Pattern B: Shell Chrome First

Start with the shell surfaces that benefit most from glass:

- `src/app/routing/mobile-shell-styles.ts`: bottom dock, tab bar container, mini-player frame
- `src/app/routing/PlaybackSurface.tsx`: sheet frame and backdrop layering
- `src/app/library/components/LoopRangeSelectorSurface.tsx`: sheet header or action row, not the full loop editor body
- `src/app/library/components/SavedTrackPlaylistMenuSurface.tsx`: modal shell or header, not the full playlist list

### Pattern C: Keep The Content Card Opaque

For surfaces like `PlaybackSurfaceContent`, prefer:

- translucent outer frame or dock
- opaque or near-opaque cards for text-heavy content
- stable icon and text contrast across hero, page, and backdrop colors

### Pattern D: Fallback Token Discipline

If the task stops at a visual fallback, keep the values aligned with the current
theme:

- page background: `#efe7d8`
- hero background: `#173229`
- shell accent: `#305c4d`
- surface background: `#fffdf8`
- border: `#d6d1c4`

Do not introduce a parallel glass palette unless the task explicitly includes a
theme revision.

## 6) Accessibility and Quality Gates

Treat these as required before completion:

- Check Reduce Transparency and provide a non-glass fallback.
- Verify legibility over both the dark hero header and the warm page background.
- Keep hit targets stable at 44 x 44 pt or larger for transport and tab controls.
- Preserve clear press states after adding blur or translucency.
- Avoid scroll-performance regressions in the shell and playback surfaces.
- Confirm the glass treatment still works when no track is active and the mini-player is absent.

## 7) Common Failure Modes

- Double translucency: glass over an already muted backdrop or blurred child muddies the UI.
- Flat glass: fully flat backgrounds behind the dock remove any refractive cue.
- Over-scoping: making discovery cards and library lists translucent harms readability faster than it helps polish.
- No runtime guard: unguarded native glass calls can break unsupported builds.
- Shell drift: moving padding, radii, or gutter ownership out of `MobileShell` can undo the shared-shell cleanup.

## 8) Reference Loading Strategy

Load only what is needed:

- `references/apple-liquid-glass-design.md`: composition, hierarchy, motion, and accessibility rules
- `references/glass-runtime-paths.md`: when to use Expo glass, blur, SwiftUI, or plain translucent surfaces
- `references/choir-mobile-surface-map.md`: current app files and the best initial glass targets

Also consult the existing workspace skills when relevant:

- `apple-hig-ios`
- `music-ui-iconography`
