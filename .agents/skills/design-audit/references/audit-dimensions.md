# Audit Dimensions

Score each screen or surface against these dimensions.

| #   | Dimension              | What to evaluate in this repo                                                                                |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | Visual hierarchy       | Is the primary action obvious on Recents, Add, Library, and the playback sheet?                              |
| 2   | Spacing and rhythm     | Are gaps, card padding, and section transitions consistent across shell, cards, and sheets?                  |
| 3   | Typography             | Is the type scale consistent between shell, hero copy, cards, lists, and modal surfaces?                     |
| 4   | Color                  | Do surface colors, borders, and accents feel system-level and readable on the warm palette?                  |
| 5   | Alignment and grid     | Do headers, cards, sheet controls, and list rows align cleanly inside the shared shell gutter?               |
| 6   | Components             | Are `SummaryCard`, sheet cards, list cards, pills, and action buttons reused consistently?                   |
| 7   | Iconography            | Do playback, queue, search, and library icons use one semantic vocabulary?                                   |
| 8   | Motion and transitions | Do sheet, modal, and mini-player transitions feel intentional rather than incidental?                        |
| 9   | Empty states           | Do empty Add, Library, playlists, and saved loops guide the user toward the next action?                     |
| 10  | Loading states         | Are discovery, search, auth, and playback-loading states informative and visually stable?                    |
| 11  | Error states           | Do auth, playback, save, and validation issues explain recovery paths clearly?                               |
| 12  | Theming                | Does the app feel cohesive across the hero header, page background, and sheet surfaces without rogue values? |
| 13  | Density                | Is the app comfortably scannable on phone screens without wasting width or collapsing touch targets?         |
| 14  | Responsiveness         | Do the layout and sheet surfaces still behave well on smaller and larger mobile viewports?                   |
| 15  | Accessibility          | Are contrast, touch targets, VoiceOver labels, and motion/transparency settings handled well?                |

## Recommended Audit Order

1. Shared shell
2. Recents
3. Add
4. Library
5. Now Playing and Queue
6. Loop builder and playlist flows
