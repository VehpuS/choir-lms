# Handoff: Nocturne visual system + playback shaping (mobile rehearsal player)

## Overview

This bundle covers a visual redesign of the **choir-lms mobile rehearsal player** (singer-facing role) onto the **Nocturne** design system, plus one new capability the redesign surfaced: **playback shaping** (speed and pitch, as both ephemeral session settings and as inputs to creating derived tracks/loops).

No feature is removed and no destination moves. The three-tab shell (Recents / Add / Library), the five Library views, the breadcrumb explorer, the persistent mini player, the bottom-sheet playback surface, the queue, and the whole advanced search/filter/sort/tag surface all keep their current behavior. What changes is the surface: the parchment-and-forest palette becomes Nocturne's dark ground, and the screens stop reading as stacked forms and start reading as a player — rows instead of cards, one large title per destination, transport where a singer's thumb already rests.

Ten screens are specified, ids `1a`–`1j`:

| id | Screen | Reference image |
| --- | --- | --- |
| 1a | Recents | `reference-images/1a-recents.png` |
| 1b | Library — Files explorer | `reference-images/1b-library-files.png` |
| 1c | Library — Tracks | `reference-images/1c-library-tracks.png` |
| 1d | Library — Loops | `reference-images/1d-library-loops.png` |
| 1e | Add — browse Google Drive | `reference-images/1e-add-from-drive.png` |
| 1f | Now Playing — collapsed | `reference-images/1f-now-playing-collapsed.png` |
| 1g | Now Playing — expanded (waveform + loop editor) | `reference-images/1g-now-playing-expanded.png` |
| 1h | Up Next (queue) | `reference-images/1h-up-next.png` |
| 1i | Speed & pitch | `reference-images/1i-speed-and-pitch.png` |
| 1j | Library search, filters and tags | `reference-images/1j-search-and-filters.png` |

Reference images are 2× captures of a 402 × 874 pt iPhone viewport (so 804 × 1748 px). Divide every pixel measurement in the images by 2 to get the pt/dp values quoted in this document.

## What the task is

**Author an OpenSpec change in the repo** (`openspec/changes/<change-id>/`) that specifies this redesign and the new capability, following `openspec/changes/CLAUDE.md` and the conventions of the existing changes (`improve-drive-search-and-bulk-library-import`, `mobile-rehearsal-ux-audit-fixes`).

A complete draft already exists in this bundle at `openspec-change/nocturne-visual-system-and-playback-shaping/` — proposal, design, tasks, and spec deltas for four capabilities. Treat it as a strong draft, not as gospel: validate it against the repo's actual current specs under `openspec/specs/` and against the real source tree before moving it in. In particular re-check that (a) every requirement id it deltas still exists with that wording, (b) the file paths in `## Impact` are current, and (c) nothing it marks "explicitly unchanged" has since changed.

The HTML in `design-source/` and the images in `reference-images/` are **design references**, not production code. The app is React Native / Expo; recreate the designs using the repo's existing component primitives (`compact-playable-row-shell`, `surface-icon-button`, `interaction-chip`, `SortFieldChipRow`, `bottom-sheet-surface`, and so on) and the rewritten token module — do not port HTML or CSS.

## Fidelity

**High-fidelity.** Colors, type sizes, weights, spacing, radii, icon choices and copy are all final and should be matched. The two exceptions, both called out in the draft:

- **Waveforms are stubs.** The bar shapes in the mockups are generated from a sine function. Production must render peaks derived from the real audio; while peaks are unavailable, render a neutral flat band, never a synthetic shape.
- **Screens 1i and parts of 1f/1g are planned features** (speed, pitch, derived entities). They depend on the Phase 5.0 engine feasibility gate.

## Design tokens

Taken from Nocturne. These replace the current `appTheme` in `src/app/utils/theme.ts`.

### Color

| Role | Value | Used for |
| --- | --- | --- |
| Ground | `#161826` | Screen background, sheet surface |
| Ground (behind sheet) | `#101220` | The dimmed page under a bottom sheet |
| Surface | `#232532` | Cards, the active loop card, search field fill |
| Surface (raised alt) | `#1b1e2c` | Mini player + tab bar band |
| Surface (accent tint) | `#2b2741` | Icon tile behind an active row glyph, tag chips, FAB |
| Text primary | `#e9e9ed` | Titles, playhead |
| Text secondary | `#cfd3e5` | Chip labels, body copy |
| Text muted | `#9397ab` | Meta lines, kickers, inactive tab labels |
| Text faint | `#75798c` | Row index numbers, disabled tempo sources, chevrons |
| Icon default | `#b2b6ca` | Icon-button glyphs |
| Accent | `#9184d9` | Lines, rings, active chips, progress, kickers |
| Accent light | `#b5abfc` | Active row title, numeric readouts, played-in-loop bars |
| Accent lighter | `#d2cefd` | Text on the `#2b2741` tag chip |
| Accent border deep | `#423a6a` | Card edge on accent-tinted cards, search-match highlight fill |
| Divider (solid) | `#3f424d` | Sheet edge, grabber, unplayed waveform bars |
| Divider (hairline) | `rgba(233,233,237,.07)` | Row separators |
| Border (subtle) | `rgba(233,233,237,.10–.16)` | Outlined controls; `.16` for buttons, `.14` for chips, `.12` for tiles |
| Accent border (soft) | `rgba(145,132,217,.55)` | Inactive per-row play ring |
| Accent glow | `rgba(145,132,217,.25–.30)` | Ambient glow on transport rings |
| Highlight (search match) | fill `#423a6a`, text `#f5f4ff` | Matched substring in results |

Rules and dividers **fade to transparent at their ends** over 40 px:
`linear-gradient(to right, transparent, rgba(233,233,237,.12) 40px, rgba(233,233,237,.12) calc(100% - 40px), transparent)`, height 1 px. Row separators are the plain hairline instead.

Accent is never used as a flood. The play button is an accent **ring** with a glow; the active tab gets a short 16 × 2 accent mark; the played part of a waveform is accent-colored bars.

### Type

Inter throughout (weights 400 and 500 only — never bolder). Monospace (`ui-monospace` / SF Mono) for every duration, time range, multiplier and semitone value.

| Token | Size / weight / tracking | Used for |
| --- | --- | --- |
| Destination title | 28 / 500 / −0.02em / lh 1.1 | "Recents", "Library", "Add" |
| Now-playing title | 32 / 500 / −0.025em / lh 1.14 | Collapsed player title (wraps to 2 lines) |
| Sheet title | 20–22 / 500 / −0.015…−0.02em | Expanded player, queue name |
| Section head | 13 / 500 | "Recent rehearsal", "Popular tags" |
| Row title | 15 / 500 | Every list row |
| Row meta | 12 / 400 / `#9397ab` | Second line of every row |
| Kicker | 10 / 400 / 0.08–0.1em / uppercase | "SORT · 24 SAVED TRACKS", "SPEED", "LOOP EDITOR" |
| Chip | 12–12.5 (500 when active) | View switcher, sort, filters, tags |
| Button | 13.5 / 500 | Play all, Save loop, Update playlist |
| Tab label | 10 / 500 | Recents / Add / Library |
| Numeric readout | 17–19 mono / `#b5abfc` | `0.90×`, `−2 st` |
| Timecode | 11–12 mono / `#9397ab` | `1:29`, `−3:09`, `1:12–1:48` |

### Spacing, radius, elevation

- Screen horizontal padding: **20** (destinations) / **22** (sheets). Top padding to first content: **58–60** (status bar included).
- Row: `padding: 11px 0`, `gap: 12`, separator hairline via inset shadow. Queue rows use `12px 0`.
- Radii: **8** default (cards, buttons, tiles), **6** for nudge buttons, **999** for chips and circular controls, **22 22 0 0** for the bottom sheet.
- Icon tile in a row: 34 × 34, radius 8. Leading bare glyph: 20 px.
- Elevation: sheets get `0 0 0 1px #3f424d, 0 -18px 44px rgba(0,0,0,.6)`. The Files FAB gets `0 0 0 1px #9184d9, 0 8px 24px rgba(0,0,0,.5)`. Nothing else is shadowed — on this ground, elevation is an edge plus ambient darkness.

### Touch targets

Every interactive element is **≥ 44 pt** in both axes. Chips use `min-height: 44px` with 13–14 px horizontal padding (visually lighter than 44, but the hit box is compliant). Row overflow triggers and per-row play buttons are 44 × 44 wrappers around 34 px visual rings. The collapsed transport play button is 76 px; the expanded one is 70 px; the mini-player one is 46 px.

### Icons

**Phosphor** (replacing MaterialCommunityIcons). Regular weight for affordances, **Fill** weight for transport and active tabs.

`waveform` (audio/derived), `music-note` (track), `music-notes` (Library tab), `repeat` (loop / repeat mode), `playlist`, `folder`, `folder-plus` (Add tab), `file` (unsupported format), `clock-counter-clockwise` (Recents tab), `magnifying-glass`, `user-circle`, `sliders-horizontal` (view options), `sliders` (speed & pitch), `caret-left/right/down`, `arrow-up/down` (sort direction), `arrow-counter-clockwise` / `arrow-clockwise` (∓15 s), `skip-back` / `skip-forward` (fill), `play` / `pause` (fill), `play-circle`, `list` (queue), `list-numbers` (ordered), `shuffle`, `dots-three-vertical` (row overflow), `dots-three` (sheet overflow), `dots-six-vertical` (drag handle), `plus`, `minus`, `check-circle` (fill), `bookmark-simple` (save loop), `tag`, `x`, `x-circle`, `info`.

Repeat vs shuffle and the drag handle vs the overflow trigger must stay visually distinct — there are existing spec scenarios asserting this; re-verify them against the Phosphor family.

## Global patterns

### Row anatomy (used on 1a, 1b, 1c, 1e, 1h, 1j)

`[leading glyph or 34px tile or index or equalizer] [title 15/500 + meta 12/#9397ab] [optional inline state] [optional 44px play ring] [44px overflow]`, `gap: 12`, hairline separator, no separator on the last row. Titles truncate with ellipsis at one line (`min-width: 0` on the text column).

The **currently playing** row is marked by: title in `#b5abfc`, leading glyph in `#b5abfc` (on an `#2b2741` tile where a tile is used), a 3–4 bar accent equalizer mark, and a filled `pause` in place of `play`. Never by a background fill.

Durations, time ranges and transform values in a meta line are monospaced. Loops read `Loop · 1:12–1:48 · 0:36`; derived entities read `Derived track · 5:09` with the transform in the title (`Lux Aeterna — Soprano · 0.90× −2 st`).

### Mini player + tab bar (1a–1e, 1j)

One band, `#1b1e2c`, `inset 0 1px 0 rgba(233,233,237,.1)` top edge.

- Mini player: `padding: 10px 16px 11px`, `gap: 12`. Leading 9-bar mini waveform, 22 px tall, bars 2 px wide with 2 px gaps, played bars accent. Title 14/500, context line 11/`#9397ab` ("Advent set · loop 1:12–1:48"). Trailing 46 px accent-ring play/pause with `0 0 14px rgba(145,132,217,.28)` glow. A 2 px accent progress line sits flush at the bottom of the mini-player row, width = progress %.
- Tab bar: `padding: 6px 8px 34px` (34 accounts for the home indicator), three equal flex items, each `gap: 5` column of [16 × 2 accent mark or spacer] / 21 px glyph / 10/500 label. Active = accent color + fill-weight glyph + the mark. Inactive = `#9397ab`, regular weight.
- On 1b the Files view adds a 52 px FAB (`plus`) overlapping the band top edge at `right: 18, top: -58`.

### Bottom sheet (1f, 1h, 1i)

Page behind goes `#101220`; the sheet is `#161826` with radius `22 22 0 0`, a 52 × 4 `#3f424d` grabber centered at the top, 12 px above it, `padding: 12px 22px 0`, bottom content padded 42 px. Header row is a 10 px uppercase kicker on the left and 44 px circular icon buttons on the right. Swipe-down dismiss and audio continuity are existing behaviors and must be preserved.

The expanded Now Playing (1g) is not a sheet in this state — it fills the screen on `#161826` and keeps the grabber and the caret-down.

### Waveform

The single most important shared component. Bars are 2–3 px wide with 2–2.4 px gaps, `border-radius: 2`, centered, `justify-content: space-between` across the available width, min height 2 px.

Bar colors: unplayed `#3f424d`; played `#9184d9`; inside the loop region and played `#b5abfc`; inside the loop region and unplayed `#796cbf`.

Four sizes appear: mini-player 9 bars / 20 px, loops-list excerpt 46 bars / 26 px, collapsed scrubber 62 bars / 56 px, expanded scrubber 62 bars / 118–120 px.

The loop region is drawn as an overlay behind the bars: `background rgba(145,132,217,.09–.10)`, `inset 0 0 0 1px rgba(145,132,217,.40–.45)`, radius 5–6. The playhead is a 2 px `#e9e9ed` vertical line with `0 0 10–12px rgba(233,233,237,.5)`. In the mockups the playhead is at 33 % (1:29 of 4:38) and the loop bracket spans 26–38 % (1:12–1:48) — consistent across every screen.

The waveform **is** the scrubber in both the collapsed (56 px) and expanded (full-height) states. In the expanded state the A and B loop handles get 10/600 `#161826`-on-`#9184d9` badges above the region edges.

## Screens

### 1a — Recents

Header: accent 10 px kicker "CHOIR LMS", 28/500 "Recents", 44 px `user-circle` button on the right.

Body: "Recent rehearsal" section head with a right-aligned "6 items" count, then five rows — the playing track (waveform glyph on the accent tile, "Playing now · 1:29 / 4:38", equalizer mark), a loop ("Kyrie — bars 41–56", "Loop · 2 hours ago"), a track ("Advent Responsory", "Yesterday · 3:52"), a playlist ("Tuesday warm-ups", "Playlist · 7 items · Sunday"), a track ("Sanctus — full choir", "Friday · 5:06"). Non-playing rows carry a soft-accent-ring play button.

Then a faded rule, a "Popular tags" head with a `See all ›` accent affordance, and five outlined tag chips: Soprano, Advent, Latin, Tricky entries, Rehearsal 12 Nov.

Replaces the current stacked resume card. Popular tags behavior is unchanged (`recents-tag-navigation`).

### 1b — Library / Files

Header: 28/500 "Library", `magnifying-glass` + `user-circle` buttons. View switcher: five chips (Files, Tracks, Loops, Playlists, Tags) in a horizontally scrolling row, active chip = accent outline + accent label + weight 500.

Explorer header: 44 px back button, a two-line current-folder block (10 px kicker "CURRENT FOLDER" over 17/500 "Advent 2026"), and a 44 px `sliders-horizontal` view-options button. Below it the breadcrumb: `Library / Season / Advent 2026`, 11.5 px, ancestors accent and tappable, current segment `#e9e9ed`.

Rows, mixed entity types with a bare 20 px leading glyph: two folders (`folder`, meta "4 tracks · 2 folders", trailing chevron), the playing track (`waveform` in `#b5abfc`, "Playing · 4:38 · 3 loops"), a track, a loop (`repeat`, "Loop · 1:12–1:48 · 0:36"), a playlist ("Playlist · 9 items · 32:14"), a track. FAB bottom right for new folder.

### 1c — Library / Tracks

Sort block: 10 px kicker "SORT · 24 SAVED TRACKS" with a 44 px direction toggle (`arrow-down` / `arrow-up`) on the right, then the sort-field chip row — Added / Name / Opened / Length — using the repo's existing `SortFieldChipRow` pattern. This same block appears on 1c, 1d and 1j; keep it identical.

Two half-width actions: **Play all** (accent outline, fill `play` glyph) and **Shuffle** (neutral outline, `shuffle`).

Rows: 22 px right-aligned monospace index (accent for the playing row, `#75798c` otherwise), title + meta ("Soprano · Latin · 3 loops"), the equalizer mark on the playing row, monospace duration, 44 px overflow. Seven rows shown.

### 1d — Library / Loops

Loops as first-class library items, sorted by Length ascending. Sort block reads "SORT · 12 SAVED LOOPS · 8:24".

Unlike the other views this is a card list (`gap: 10`), because the playing loop expands:

- **Playing loop card**: `#232532`, radius 8, `0 0 0 1px #9184d9`, `padding: 13px 14px`. Title 15/500 in `#b5abfc` ("Bars 41–56 · soprano entry"), parent track on the meta line ("Lux Aeterna — Soprano"), 36 px pause ring, overflow. Below: a 28 px waveform excerpt, then a monospace footer row `1:12` / `0:36 · ×4` (centered, `#e9e9ed`) / `1:48`.
- **Other loops**: outlined only (`inset 0 0 0 1px rgba(233,233,237,.1)`), single row — title, meta `parent track · 2:04–2:31` with the range monospaced, monospace length, 34 px play ring. No waveform.

The mini player shows the loop as the playing item ("Loop · repeat ×4 · 0:36").

### 1e — Add (Google Drive)

Header: 28/500 "Add", three 44 px buttons (`arrows-clockwise`, `magnifying-glass`, `user-circle`), and "Signed in as m.reyes@choir.org" at 13/`#9397ab`.

Breadcrumb `My Drive / Choir 2026 / Advent` (wraps). Then the save-acknowledgment card: `#232532`, radius 8, `0 0 0 1px #423a6a`, fill `check-circle` in `#b5abfc`, "Saved to Library" over the filename, and an accent "Open" affordance.

Rows: two folders (meta "Updated 3 Nov"), then audio files with format/size/duration metadata ("MP3 · 8.4 MB · 4:38") and a trailing pill — **Saved** (muted, neutral outline, non-interactive) or **Save** (accent outline, accent label). The last row is a PDF at `opacity: .5` with the meta "Not a supported audio format" and no action.

### 1f — Now Playing, collapsed

Sheet. Kicker "REHEARSING QUEUE", `list` (queue) and `caret-down` buttons.

Title block, 40 px down: accent 11/500 uppercase "PLAYING", 32/500 title over two lines, "Advent set · 3 of 9" at 14/`#9397ab`, then the active loop chip — accent outline, `repeat` glyph, monospace `1:12–1:48`, `· ×4`.

Scrubber: 56 px waveform with the loop region overlay and the playhead, then `1:29` / `−3:09` monospace on the ends.

Transport, centered, `gap: 18`: 44 px `skip-back` (fill, `#b2b6ca`), 44 px `arrow-counter-clockwise` (−15 s, `#e9e9ed`), **76 px accent ring** with `inset 0 0 0 1.5px #9184d9, 0 0 28px rgba(145,132,217,.3)` and a 30 px fill `pause`, 44 px `arrow-clockwise`, 44 px `skip-forward`. The ±15 s and skip controls keep their existing conditional-visibility rules.

Faded rule, then the practice row: two flexible accent-outlined tiles showing the current **Speed** (`0.90×`) and **Pitch** (`−2 st`) as 17 px mono `#b5abfc` readouts under 10 px kickers, plus two 52 px square tiles for repeat (active, accent) and shuffle (inactive, neutral). Tapping either readout tile opens 1i.

Footer affordance, pinned to the bottom: accent `waveform` + "Waveform and loop editor" → opens 1g.

There is **no pitch-lock control** anywhere. Speed in this app always preserves pitch, so the control would be meaningless; a lint or test guard should assert it never appears.

### 1g — Now Playing, expanded

Full screen on `#161826`. Grabber, kicker "LOOP EDITOR", `list` + `caret-down`. Title 20/500, context line "Advent set · 3 of 9 · 0.90× · −2 st" — the active shaping is always visible in the context line.

Hero waveform: 120 px bars, loop region overlay, A/B badges, playhead. Below it a three-part monospace scale: `0:00` / `1:29` (in `#e9e9ed`) / `4:38`.

Loop editor row, `gap: 10`:
- **Start** — outlined tile, kicker, `1:12.4` at 15 px mono, and two 44 px nudge buttons (`minus`, `plus`, radius 6).
- **Length** — 86 px fixed tile, `#1d1f30` with `inset 0 0 0 1px #423a6a`, `0:36.0` in `#b5abfc`, and "bars 41–56" at 11 px.
- **End** — mirrors Start, `1:48.4`.

Transport, reduced to three controls (−15 s, 70 px accent ring, +15 s). Then two half-width actions: **Save loop** (accent outline, `bookmark-simple`) and **Speed & pitch** (neutral outline, `sliders`) → 1i.

### 1h — Up Next

Sheet. Kicker "UP NEXT", `play-circle` + `caret-down`. Queue name 22/500 "Advent set", meta "9 items · 32:14 · ordered · repeat all".

Mode chips: **Ordered** (accent, `list-numbers`), Shuffle (neutral, `shuffle`), **All** (accent, `repeat`). Faded rule.

Rows, `padding: 12px 0`: a 16 px leading slot holding either the accent equalizer (current item) or a monospace index, title + meta ("Track · 4:41", "Loop · 0:27 · ×2"), and a 46 px circular neutral-outlined `dots-six-vertical` drag handle. Both tracks and loops appear in the queue; the current item's title is `#b5abfc` with meta "Playing · loop 1:12–1:48".

Pinned footer, two half-width actions: **Update Advent set** (accent outline) and **Save as new** (neutral outline). Reorder, mode switching and playlist save/update behaviors are unchanged.

### 1i — Speed & pitch (planned)

Sheet. Kicker "SPEED & PITCH", `caret-down`. Context: 15/500 track title, 12 px "Loop · 1:12–1:48".

**Speed** — kicker left, 19 px mono `0.90×` in `#b5abfc` right. A continuous 4 px track (`#292b31`) with an accent filled portion, a 14 px `#e9e9ed` thumb with an accent glow, and a 1 px `#75798c` detent tick at the 1.00× midpoint. Scale labels `0.50×` / `1.00×` / `1.50×`. Helper: "Continuous. Pitch is never shifted by speed."

**Tempo source** — three chips: **Multiplier** (active, accent), BPM and Follow score (both inert: `rgba(233,233,237,.1)` border, `#75798c` label). Helper: "BPM and score-follow (MIDI / MusicXML) arrive later; dynamic tempo maps then replace the flat multiplier." The field exists now so the control doesn't have to move when those land.

Faded rule.

**Pitch** — kicker left, 19 px mono `−2 st` right. A stepper: 46 px `minus` and `plus` buttons (radius 8, neutral outline) flanking a 24 px tick strip of nine 2 px bars — center bar `#e9e9ed` at full height (zero), bars between zero and the current value accent, others `#3f424d`. Helper: "Semitone steps, −12 to +12. Tempo is unchanged."

Pinned footer: an accent `info` glyph with "Applies to this session only until saved.", then a full-width **Save as derived loop** (accent outline) with a 52 px `dots-three` overflow, and a centered 11.5 px note "Also available: save as derived track".

Model: `speedMultiplier` float 0.50–1.50 default 1.0; `pitchSemitones` int −12…+12 default 0; `tempoSource` `'multiplier' | 'bpm' | 'score'` with only `'multiplier'` implemented. Committing creates a derived entity that stores `sourceRef` + optional `range` + `transform` — **metadata, never rendered audio** — which keeps the change inside the existing by-reference Drive model and the "no offline playback" MVP boundary.

### 1j — Library search, filters and tags

Restyled, not reduced. Every control in `mobile-library-organization` is present and behaves as specified today; verify scenario by scenario.

Search bar: 44 px field, `#232532` with an accent inset border, accent `magnifying-glass`, the query text, a 1 px accent caret, a trailing 44 px `x-circle` clear, and an accent "Cancel" beside it. Below: a two-segment scope control — **This folder** / Whole library — as one 8 px-radius group with the active segment carrying the accent inset border.

Entity filter chips: All / Tracks / Loops / Playlists / Folders. Faded rule.

Tags block: kicker "TAGS" with a segmented **Any / All** match-mode control (pill group, active segment accent-outlined) on the right; then chips — selected tags as filled `#2b2741` / `#d2cefd` chips with a `tag` glyph and an `x`, unselected as neutral outlines.

Sort block: identical to 1c/1d — kicker, direction toggle, field chips.

Faded rule, result count "3 results · tags: Soprano + Latin", then result rows with the matched substring highlighted (`#423a6a` fill, `#f5f4ff` text, radius 3, 2 px padding) in either the title or the meta line. The third result is a **derived track** — title "Lux Aeterna — Soprano · 0.90× −2 st", meta "Derived track · 5:09", `waveform` glyph — showing how derived entities surface in results.

No mini player in this state (search is a full-screen mode); the tab bar remains.

## Interactions & behavior

- **Tab bar** — three destinations, unchanged. Active tab: accent mark + fill glyph + accent label.
- **View switcher** — horizontal scroll, single selection, no behavior change.
- **Explorer** — tap folder to descend, back button and breadcrumb ancestors to ascend, FAB creates a folder.
- **Rows** — tap the row to open/play, tap the play ring to start playback of that entity, tap overflow for the existing action menu (queue, tag, add to playlist, rename, remove).
- **Mini player** — tap to open the collapsed playback sheet; the accent ring toggles play/pause; the 2 px line is progress only, not a scrubber.
- **Playback sheet** — swipe down or `caret-down` to dismiss; audio continues. `list` opens Up Next (1h). The footer affordance and the "Speed & pitch" button open 1g and 1i respectively.
- **Waveform** — drag to scrub in both collapsed and expanded states; in the expanded state drag the A/B handles to change the loop, or use the Start/End nudge buttons. The loop region and playhead must stay in sync with the mini-player progress line.
- **Speed & pitch** — apply immediately and continuously to the active item; ephemeral for the session; survive pause/resume and queue advance per spec; reset when specified. The active values must be reflected in the mini-player and playback context lines and in the practice-row readouts. Saving creates a derived entity with a smart default name consistent with the existing loop-naming requirement.
- **Search** — app-owned dedicated search; scope, entity filters, tag match mode and sort all filter live; matched substrings highlight in results.
- **Queue** — long-press drag to reorder via the handle; mode chips toggle ordered/shuffle and repeat; footer actions update the source playlist or save a new one.

## State

Existing state is unchanged. New:

- `session.shaping: { speedMultiplier, pitchSemitones, tempoSource }` on the active playback item.
- `peakCache[sourceId@driveRevision] -> number[]` — versioned, invalidated on Drive revision change.
- Derived entities in the library store: `{ id, sourceRef, range?, transform, name, tags, … }`.

## Assets

No image assets. All iconography is Phosphor, all waveform rendering is generated from audio peaks at runtime. Fonts: Inter (already in the app) plus the platform monospace face.

## Files in this bundle

- `README.md` — this document.
- `CLAUDE_CODE_PROMPT.md` — the brief to open the Claude Code session with.
- `reference-images/1a…1j.png` — 2× captures of all ten screens.
- `openspec-change/nocturne-visual-system-and-playback-shaping/` — the drafted OpenSpec change: `proposal.md`, `design.md`, `tasks.md` (seven implementation phases with a feasibility gate at 5.0), `.openspec.yaml`, and spec deltas for `playback-shaping`, `mobile-rehearsal-player-ui`, `mobile-library-organization`, `practice-loops-and-playlists`.
- `design-source/Rehearsal Player Redesign.dc.html` + `ios-frame.jsx`, `support.js` — the source of the mockups. Useful for reading exact values; the waveform generator at the bottom of the HTML documents the bar-color logic precisely. The reference images are the canonical visual record.
