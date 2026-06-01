# Recents Compact Mockups (Task 1.6)

Goal: Validate that Recents can show multiple shortcut modules (recent tracks/loops/playlists and popular tags) without becoming visually heavy on phone-sized layouts.

## Mockup A: Empty History (first use)

State intent:

- Recents remains optional and non-blocking.
- User gets immediate next-step guidance to Add or Library.

```text
+------------------------------------------------+
| Recents                                        |
| Optional shortcuts for faster playback         |
+------------------------------------------------+
| No recent tracks, loops, or playlists yet      |
| Start in Add or Library                        |
| [Open Add]      [Open Library]                 |
+------------------------------------------------+
| Popular tags                                   |
| [Soprano] [Alto] [Tenor] [Bass] [Warmup]       |
+------------------------------------------------+
```

Compactness notes:

- Empty-state copy is 2 lines max.
- CTA row remains one line with two primary actions.
- Tags are displayed in one wrapped row before truncation.

## Mockup B: Active User (recent history available)

State intent:

- Continue action appears first.
- Recents module and popular tags module are both visible above the fold on common phone heights.

```text
+------------------------------------------------+
| Recents                                        |
+------------------------------------------------+
| Continue from last item                        |
| Gospel Medley - Alto Guide                     |
| Last played 18m ago                            |
| [Resume track]                                 |
+------------------------------------------------+
| Recent tracks, loops, and playlists            |
| 1) Sunday Anthem - Soprano                     |
| 2) Kyrie - Tenor                               |
| 3) Psalm 23 - Bass                             |
| [See all]                                      |
+------------------------------------------------+
| Popular tags                                   |
| [Blend] [Entrances] [Dynamics] [Latin]         |
+------------------------------------------------+
```

Compactness notes:

- Continue card is one action-only row cluster with entity-aware action text.
- Recent items module shows a compact viewport (3 rows standard, 2 on smallest heights) and supports vertical scrolling.
- The recent-items dataset cap is 50 entries.
- Popular tags stay chip-based and secondary.

## Optional density fallback

If vertical space is constrained:

- Collapse Recent items to two rows.
- Keep Continue from last item and one-line Popular tags visible.
- Move See all to a text link at the end of the section title row.

## Scrolling behavior for recent items

- Recents supports scrolling within the Recent tracks, loops, and playlists module.
- Default compact viewport: 3 rows (2 rows on smallest supported heights).
- Maximum retained/rendered recent entries for this module: 50.
- The module preserves compact height while allowing deep history access through scroll.

## Design confirmation checklist

- Continue from last item remains the first actionable block in active state.
- Add and Library CTAs remain explicit in first-use empty state.
- Popular tags are present but secondary to Continue and recents.
- Layout stays scannable at one-handed reading distance.
- Recents remains optional and does not duplicate Drive browse controls.
