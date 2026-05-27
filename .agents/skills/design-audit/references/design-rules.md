# Design Rules

Use these rules to turn findings into an implementation plan.

| #   | Rule                               | Core test                                                                                                              |
| --- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | Simplicity is structural           | Can a decorative layer, extra card, or redundant sentence be removed without losing meaning?                           |
| 2   | One shell, one system              | Does the shared shell still own the main gutter and chrome instead of each screen inventing its own frame?             |
| 3   | Hierarchy beats decoration         | Is the primary action clear through placement, size, and spacing before color or ornament?                             |
| 4   | Consistency is visible             | Would the same component look and behave the same in every screen where it appears?                                    |
| 5   | Dense content stays readable       | Does polishing the UI preserve fast scanning of saved tracks, loops, playlists, and search results?                    |
| 6   | Modal surfaces are intentional     | Does every sheet or modal feel like part of the same family of surfaces?                                               |
| 7   | Native feel wins                   | When choosing between a clever custom pattern and a native-feeling one, does the app choose the native-feeling option? |
| 8   | No cosmetic changes without reason | Can each styling change be justified by clarity, consistency, accessibility, or platform fit?                          |

## Common Violations

- adding nested radii and padding that fight the shared shell
- using new one-off colors instead of the app theme
- treating every card like a hero card
- adding visual polish that weakens list readability
- changing copy tone or button emphasis without a clear hierarchy reason
