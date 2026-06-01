---
name: apple-hig-ios
description: "Apply Apple Human Interface Guidelines (HIG) to iOS UI work in this app. USE WHEN designing or reviewing iOS UI components: tab navigation, playback controls and scrubbers, library lists, loop-range sliders, context menus, search fields, loading states, sheets/modals, or accessibility labels. TRIGGERS: 'tab bar', 'navigation', 'playback UI', 'scrubber', 'loop range', 'slider', 'now playing', 'library list', 'context menu', 'add to playlist menu', 'search', 'loading state', 'sheet', 'modal', 'accessibility', 'VoiceOver', 'minimum tap target', 'HIG', 'Apple design guidelines'."
---

# Apple HIG — iOS Design Guidance for Choir LMS Mobile

Source: [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
Scoped to iOS surfaces in `packages/mobile-rehearsal-player`.

---

## Tab Navigation

**Reference:** [HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)

The app currently uses a Library / Add / Recents tab structure.

- Use tab bar for **navigation between top-level sections only** — not as a toolbar for actions.
- Keep all tab items **always enabled** even when a section has empty content; explain the empty state inline instead of disabling the tab.
- Use **single-word labels** beneath each tab icon.
- Prefer **SF Symbols** (or the closest React Native equivalent) for tab icons; use the filled variant for the selected state.
- On iOS, the tab bar **floats above content** at the bottom on a Liquid Glass background; keep content scrollable behind it rather than clipping.
- For the MiniPlayer / PlaybackSurface accessory attached to the tab bar, support **tab bar minimize behavior**: hide the full tab bar when the user scrolls down within a tab and restore it when they scroll back to the top.
- Keep `Add` as a destination for Google Drive browse, search, and add-to-library work; do not rename the destination back to `Search`.
- Reserve the magnifier for search actions within Add and Library rather than using it as the destination label.

---

## Playback Surface and Now-Playing UI

**Reference:** [HIG: Playing audio](https://developer.apple.com/design/human-interface-guidelines/playing-audio)

Applies to `PlaybackSurface`, `PlaybackControlCards`, `PlaybackMarqueeText`, `PlaybackSessionModeCard`, `PlaybackWaveform`.

### Audio session

- Use the **Playback** audio session category (`AVAudioSession.Category.playback`) — this prevents the silence switch from cutting audio and allows background playback, which is essential for a rehearsal app.
- **Support audio rerouting**: let users redirect to AirPlay, Bluetooth, or external speakers without interrupting playback.
- Use `MPVolumeView` (or the React Native equivalent) for volume control — do **not** use a plain slider for system volume; the system provides a volume view for that.
- When an interruption (phone call, other app) ends, check whether it is `shouldResume` before auto-resuming playback.
- When the app finishes temporary audio (e.g., a loop preview), flag the audio session with `notifyOthersOnDeactivation` so other apps can resume.

### Playback controls layout

- Provide a **press/active state** for every custom playback button; without it the control feels unresponsive.
- Transport buttons (rewind, play/pause, skip) need a **minimum hit region of 44 × 44 pt**.
- Keep the number of prominent buttons to **one or two per row**; use icon + accessible label pairs for all others.
- Respond to external controls (Control Center, headphone controls) only when the app is the active audio app; do not halt playback from other apps otherwise.
- Avoid repurposing the meaning of standard transport controls — users expect play, pause, skip, and rewind to behave consistently.
- Use the system-provided playback controls where possible; only create custom controls when you need to expose commands the system doesn't support (e.g., custom loop-increment skipping).

### MiniPlayer / bottom accessory

- The MiniPlayer (collapsed playback accessory attached to the tab bar) should display the current track title, a play/pause button, and a skip button at minimum.
- Tapping the MiniPlayer should expand to the full PlaybackSurface.
- Apply marquee / ticker text (`PlaybackMarqueeText`) only for titles that overflow their container — do not animate short text.

---

## Sliders — Playback Scrubber and Loop Range

**Reference:** [HIG: Sliders](https://developer.apple.com/design/human-interface-guidelines/sliders)

Applies to the playback scrubber, `LoopRangeSelectorSurface`, and any loop-start / loop-end controls.

- **Do not use a plain slider for volume** — use `MPVolumeView` instead (HIG iOS/iPadOS platform note).
- Place the **minimum on the leading edge** and maximum on the trailing edge — this is the direction users universally expect.
- Provide **live feedback** as the scrubber moves: update the playback position indicator in real time; do not defer to thumb release.
- For the loop-range selector, use **clear leading/trailing endpoint icons** (e.g., loop-in / loop-out icons) to communicate that the thumb corresponds to a range boundary, not a single value.
- If the range slider covers a wide domain (e.g., the full track duration), consider showing the **current value as a time label** adjacent to each thumb — this is especially important when precise loop positioning matters.
- For a dual-handle range slider, visually distinguish the selected range (fill color between the two thumbs) from the unselected portions of the track.

---

## Library Lists

**Reference:** [HIG: Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)

Applies to `DriveLibrarySection`, `DriveFolderGroup`, `SavedLoopList`, `SavedPlaylistSection`, `SavedPlaylistSectionCards`.

- Use the **disclosure indicator chevron** (not the info button) for rows that drill into a sub-view (e.g., folder → folder contents, playlist → track list).
- Support **swipe-to-delete or swipe-to-add** actions where those are the primary mutation operations on a list item.
- In edit mode (reordering playlists, reordering loops), present **drag handles** on the trailing or leading side consistently; do not mix patterns.
- Keep row labels **succinct** — truncate with an ellipsis in the middle rather than the tail if both the start and end of the title are distinctive.
- For **empty states** (no saved loops, no playlists yet), show a brief explanatory message in the list area itself rather than an empty white space.
- Groups (folders, library sections) should use **section headers** to visually separate them from one another.
- Provide **appropriate feedback on selection**: if selecting a row navigates to a child view, keep the row highlighted; if it toggles a selection (e.g., adding to a playlist), briefly highlight and show a checkmark.

---

## Context Menus and Track Action Menus

**Reference:** [HIG: Context menus](https://developer.apple.com/design/human-interface-guidelines/context-menus)

Applies to `SavedTrackPlaylistMenuSurface` and any long-press / three-dot menus on track rows.

- A context menu is revealed by a **long press** on a list row in iOS.
- Include **only the most likely actions** in the menu — avoid long menus that require scrolling. For this app: Add to Playlist, Remove from Library, Play Next, Play are appropriate top-level items.
- Make every context menu item **also accessible in the main UI** (toolbar, detail view, etc.) — context menus are a shortcut, not the only path.
- **Hide unavailable items** rather than disabling (dimming) them — context menus show only relevant actions.
- Mark **destructive actions** (Delete Loop, Remove from Playlist) at the end of the menu and set their `UIMenuElement.Attributes.destructive` flag so they render in red.
- Use **one level of submenu at most** — e.g., "Add to Playlist → [Playlist A, Playlist B, New Playlist…]" is acceptable; deeper nesting is not.
- Represent actions with **recognizable SF Symbol icons** (e.g., `plus` for add, `trash` for delete, `play.fill` for Play Next).

---

## Search

**Reference:** [HIG: Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields)

Applies to `DriveLibrarySearchPanel`, `LibrarySearchPanel`, `AddScreen`.

- Search is an operation in this app, not the destination label. Keep search entry points visible inside Add and Library without reintroducing a dedicated Search tab.
- When entering Add, do not steal focus from Drive browsing controls by default; only focus the field immediately when the user explicitly chose a search-first affordance.
- Show **search results as the user types** (live search), not only on submit. This makes search feel more responsive.
- Display **placeholder text** that describes the scope: e.g., "Songs, folders, playlists…" — not just "Search".
- If search has scope categories (e.g., All / Songs / Playlists), use a **segmented scope control** directly below the search field.
- Show **recent searches or suggestions** before the user types to help discoverability.
- For the inline library filter (`LibrarySearchPanel`), position the field **above the list it filters** and pin it to the top toolbar when scrolling.

---

## Loading and Status

**Reference:** [HIG: Progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators)

Applies to `DriveDiscoveryPanel`, `DriveLibraryStatusCard`.

- When loading a library or discovering Drive folders, use an **indeterminate spinner (activity indicator)** if the duration is unknown.
- If loading has a known total (e.g., syncing N items), switch to a **determinate progress bar** — users prefer knowing how long to wait.
- Never leave a spinner **stationary** — a frozen indicator looks like a crashed app.
- Pair a loading indicator with a short, **accurate description**: e.g., "Loading library…" or "Scanning folders…". Avoid vague terms like "Loading" or "Please wait".
- When loading fails, replace the spinner with an **error state card** that describes the problem and offers a Retry action — do not leave the spinner on screen.
- Support **pull-to-refresh** on library lists so users can force a reload without navigating away.

---

## Sheets and Modals

**Reference:** [HIG: Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)

Applies to `PlaybackSurface` (when expanded from MiniPlayer), `DriveLibraryRootSelector`, `SavedTrackPlaylistMenuSurface`.

- The expanded PlaybackSurface should use **a resizable sheet with a grabber** if it slides up from the tab bar area — this is the Music app model. Support large and medium detents, or custom height detents.
- Include a **grabber indicator** at the top edge of any resizable sheet so users know they can drag it.
- Support **swipe-down to dismiss** — users always expect this in iOS sheets.
- For sheets that show a scoped task (e.g., choosing a playlist root, choosing a loop save name), always pair a **Done button on the trailing edge** with a **Cancel button on the leading edge** of the top toolbar.
- Show **only one sheet at a time** from any parent view — if a secondary sheet is needed, close the first one before displaying it.
- Prefer the **medium detent** for the playlist selector so it doesn't obscure the whole library view behind it.

---

## Accessibility

**Reference:** [HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

### Hit targets

- All interactive controls must meet **44 × 44 pt** minimum tap target on iOS. This includes play/pause, loop markers, skip buttons, and list row actions.
- Add **~12 pt padding** around bezeled elements and ~24 pt around elements without a bezel.

### VoiceOver labels

- Every playback button needs an `accessibilityLabel`: e.g., "Play", "Pause", "Skip Forward 15 Seconds", "Loop Start", "Loop End".
- Sliders need an `accessibilityLabel` and an `accessibilityValue` that reads the current time position or percentage: e.g., "Playback position, 1 minute 23 seconds".
- Library rows need a label that includes both title and secondary detail (e.g., artist or duration) so VoiceOver reads them in one pass.
- The MiniPlayer accessory should announce its state: "Now playing: [Track Name]".

### Color and contrast

- Text and icons must meet **WCAG AA contrast ratios**: 4.5:1 for text below 18 pt, 3:1 for text at 18 pt and above or bold.
- Do **not** rely on color alone to convey state (e.g., loop-active state should use an icon change or label, not just a color tint).
- Support **Increase Contrast** system setting — test playback controls and status badges in high-contrast mode.

### Motion and audio

- If the waveform (`PlaybackWaveform`) has animation, respect the **Reduce Motion** system setting and display a static representation when it is on.
- Pair audio cues (e.g., loop boundary chime) with a **haptic** so users who have audio muted still get feedback.
- Provide **accessibility hints** for non-obvious interactions: e.g., the loop range thumb should hint "Double-tap and hold to adjust loop start position".

### Cognitive

- Do not auto-dismiss the PlaybackSurface or any sheet on a **timer** — require an explicit dismiss action so users with cognitive or motor difficulties are not rushed.
- Avoid auto-playing a new track without user intent; always provide visible controls to stop or change playback.

---

## Button Hierarchy

**Reference:** [HIG: Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)

- Use at most **one or two prominent (filled/tinted) buttons** per view. For the playback surface, Play/Pause is the primary button and should be visually dominant.
- Use **style to distinguish hierarchy**, not size — keep all transport buttons the same physical size but vary visual weight (filled vs. outline).
- Secondary transport controls (shuffle, repeat, loop toggle) should use an **outline or monochromatic style** unless they are in an active/toggled state, in which case apply an accent tint.
- When an action is loading (e.g., buffering before playback starts), show an **activity indicator within the button** rather than adding a separate spinner to the layout.
- Every button needs a clear **press / active state** — without feedback, users will tap repeatedly thinking the app is unresponsive.
- Use title-case labels on text buttons: "Add to Playlist", "Save Loop", "Play Next".

---

## SF Symbol Guidance

For React Native, use the `react-native-sf-symbols` package or fallback to equivalent `@expo/vector-icons` / `lucide-react-native` icons that match the HIG semantic meaning:

| Action              | SF Symbol name                                    | Semantic meaning                   |
| ------------------- | ------------------------------------------------- | ---------------------------------- |
| Play                | `play.fill`                                       | Start playback                     |
| Pause               | `pause.fill`                                      | Pause playback                     |
| Skip forward        | `forward.end.fill` / `forward.fill`               | Next track / skip                  |
| Skip backward       | `backward.end.fill` / `backward.fill`             | Previous track / skip back         |
| Loop                | `repeat`                                          | Repeat all                         |
| Loop one            | `repeat.1`                                        | Repeat single track                |
| Shuffle             | `shuffle`                                         | Shuffle queue                      |
| Loop range          | `arrow.trianglehead.clockwise` or `record.circle` | Active loop / loop mode            |
| Add to playlist     | `text.badge.plus`                                 | Add to a collection                |
| Folder              | `folder.fill`                                     | Drive folder                       |
| Library             | `music.note.list`                                 | Saved library section              |
| Search              | `magnifyingglass`                                 | Search action only                 |
| Loading             | `progress.indicator` / spinner                    | Async operation in progress        |
| Error / unavailable | `exclamationmark.circle`                          | Status badge, not a primary action |

---

## Sources

All guidance in this skill is summarized from the Apple Human Interface Guidelines published at:

- https://developer.apple.com/design/human-interface-guidelines/tab-bars
- https://developer.apple.com/design/human-interface-guidelines/playing-audio
- https://developer.apple.com/design/human-interface-guidelines/sliders
- https://developer.apple.com/design/human-interface-guidelines/buttons
- https://developer.apple.com/design/human-interface-guidelines/context-menus
- https://developer.apple.com/design/human-interface-guidelines/search-fields
- https://developer.apple.com/design/human-interface-guidelines/progress-indicators
- https://developer.apple.com/design/human-interface-guidelines/lists-and-tables
- https://developer.apple.com/design/human-interface-guidelines/sheets
- https://developer.apple.com/design/human-interface-guidelines/accessibility
