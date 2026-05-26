---
name: music-ui-iconography
description: "Guide UI work that needs music iconography aligned with Music on Mac semantics. USE WHEN designing or refining playback controls, queue views, library actions, favorites, downloads, lyrics, shuffle, repeat, output routing, or playback state badges. TRIGGERS: 'music icons', 'player icons', 'playback controls', 'queue', 'shuffle', 'repeat', 'lyrics', 'AirPlay', 'favorite', 'download badge', 'Apple Music look'."
---

# Music UI Iconography

Use this skill when an agent is choosing icons, badges, or control treatments for music playback and library UI.

Base the semantic model on Apple's "Symbols used in Music on Mac" reference, but do not copy proprietary artwork. Prefer platform system symbols and match the meaning and state behavior users already expect from Music.

Reference: https://support.apple.com/en-il/guide/music/mus131245dbe/mac

## Core Rules

- Use familiar music-player semantics before inventing new iconography.
- Distinguish primary actions from passive status badges.
- Reuse one icon vocabulary across transport, queue, library, and output surfaces.
- Keep toggled, disabled, loading, and unavailable states visually explicit.
- Pair icon-only controls with accessible labels, hints, and selected state text.
- If a symbol is uncommon or stateful, add a nearby text label or tooltip.
- Match Apple's semantic patterns, not Apple's proprietary asset artwork.

## Semantic Mapping

| Intent                                  | Preferred treatment                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Play / pause                            | Standard transport symbols for the primary control. Swap the icon with the current state instead of showing both at once. |
| Queue / Up Next                         | List or stacked-lines icon that can show a selected state when the queue is open.                                         |
| Shuffle                                 | Crossing arrows with an active treatment only when shuffle is enabled.                                                    |
| Repeat all                              | Repeat loop icon.                                                                                                         |
| Repeat one                              | Repeat loop with an explicit single-item indicator.                                                                       |
| Lyrics                                  | Quote or lyrics-lines icon; treat as a panel toggle, not as a playback mode.                                              |
| Favorite                                | Heart outline for available action, filled heart for active favorite.                                                     |
| Add to library                          | Add or plus affordance tied to track, album, or playlist ownership.                                                       |
| Download                                | Downward-arrow download action; separate can-download, downloading, and downloaded states.                                |
| Volume / mute                           | Speaker icons with level changes; use a muted or slashed state instead of reusing the same volume icon unchanged.         |
| Output routing                          | AirPlay or audio-route icon separate from volume.                                                                         |
| Search                                  | Magnifier only for discovery and search, never for filter or queue state.                                                 |
| Sort / filter                           | Sort or filter controls belong to library and list management, not transport.                                             |
| Explicit / Lossless / Dolby Atmos       | Render as readable badges or chips rather than cryptic standalone icons.                                                  |
| Collaboration / shared playlist         | Person or group-based glyphs for shared ownership and join states.                                                        |
| Unavailable / cloud-only / sync pending | Status badges only; do not present them as tappable primary actions.                                                      |

## Design Guidance

- Prefer SF Symbols on Apple platforms and the closest equivalent on other platforms.
- Use filled variants for high-emphasis actions and outline variants for secondary affordances when the platform icon set supports that distinction.
- Keep icon weights aligned within the same toolbar, card, or control row.
- Avoid mixing metaphor families, such as hearts for favorites and stars for ratings, unless the product semantics truly differ.
- Avoid icon-only status rows for uncommon states such as sync pending or unavailable items; use supporting text.

## Accessibility

- Every icon-only control needs an accessible name that describes the action, not the shape.
- Expose toggle state through accessibility APIs for shuffle, repeat, lyrics, queue, favorite, and output selectors.
- Maintain minimum touch targets even if the visual glyph is small.
- Do not rely on color alone to distinguish enabled, disabled, or error states.

## Workflow For Agents

1. List each user-facing music action and passive state in the surface being edited.
2. Map each item to the semantic buckets above before choosing icons.
3. Prefer existing design system or platform symbols; only introduce custom artwork if the system set cannot represent the meaning.
4. Document any ambiguous mapping in the plan or implementation notes so follow-on sessions stay consistent.
