# Mobile Rehearsal Player UI Mockups

These original low-fidelity wireframes describe a rehearsal-first mobile interface that borrows proven interaction patterns from modern music apps without copying any single product's layout or styling.

## UX Principles

- Keep discovery and ownership separate: Google Drive browsing is for finding material, while Library is for saved rehearsal structures.
- Preserve playback context: a persistent mini-player keeps the current session visible across destinations.
- Make action density intentional: each row should expose the next likely action without turning into a control panel.
- Keep queue state close to playback: users should reach Up Next in one tap from now playing.
- Favor scan-first layouts: short sections, segmented collections, and strong hierarchy beat dense settings-heavy screens.
- Keep loop capture audible: users should mark loop boundaries from real playback context, not from raw timestamp fields alone.
- Preserve rehearsal cues: loop badges, source labels, and playlist context should stay visible when they affect playback behavior.

## Screen 1: Home / Discovery

```text
+--------------------------------------+
| Good evening                         |
| Search rehearsal audio         [o]   |
| [My Drive] [Shared] [Recent] [Saved] |
|                                      |
| Continue practicing                  |
| [ Alto warmup ] [ Kyrie loop ] [ ...]|
|                                      |
| Browse choir spaces                  |
| [ Sop ] [ Alto ] [ Ten ] [ Bass ]    |
|                                      |
| Fresh from Drive                     |
| Gloria - Alto guide             [+]  |
| Psalm 42 full mix              [>]   |
| Amen cadence rehearsal         [+]   |
|                                      |
| [art] Gloria - Alto guide      [||]  |
| Home        Search      Library      |
+--------------------------------------+
```

Why: This screen opens with a browse-first surface, gives quick pivots into Drive roots, and keeps the active listening session present through the mini-player.

## Screen 2: Source Browser

```text
+--------------------------------------+
| < Shared folders                     |
| Choir Archive / Spring Concert       |
|                                      |
| Folders                              |
| Alto Section                    >    |
| Soprano Section                 >    |
| Full Mixes                      >    |
|                                      |
| Audio in Spring Concert              |
| Ave Maria - Full rehearsal      [+]  |
| Ave Maria - Alto part           [+]  |
| Warmup vowels                   [>]  |
|                                      |
| Unavailable here                      |
| Notes.pdf                       --   |
| Legacy stream link              --   |
|                                      |
| [art] Warmup vowels             [>]  |
| Home        Search      Library      |
+--------------------------------------+
```

Why: Source context stays visible through breadcrumbs and section labels so users know whether they are looking at shared folders or saved content.

## Screen 3: Search

```text
+--------------------------------------+
| Search                               |
| [ kyrie alto___________________ ]    |
| [Tracks] [Loops] [Playlists] [All]   |
|                                      |
| Top results                          |
| Kyrie - Alto rehearsal         [>]   |
| Kyrie - Alto entrance loop     [+]   |
| Kyrie sectional playlist       [>]   |
|                                      |
| Matching folders                      |
| Shared / Easter / Kyrie         >    |
|                                      |
| Recent searches                       |
| kyrie | amen cadence | vowels        |
|                                      |
| [art] Kyrie - Alto rehearsal   [||]  |
| Home        Search      Library      |
+--------------------------------------+
```

Why: Search prioritizes low-friction scanning and immediate action, with filters that reduce noise for rehearsal-specific queries.

## Screen 4: Library

```text
+--------------------------------------+
| Your Library                    [+]  |
| [Tracks] [Loops] [Playlists]         |
| Sort: Recently used             [v]  |
|                                      |
| Saved tracks                         |
| Gloria - Alto guide            [>]   |
| Psalm 42 full mix              [...] |
| Warmup vowels                  [...] |
|                                      |
| Saved loops                          |
| Kyrie entrance (0:42-1:06)    [>]    |
| Amen cadence (2:10-2:28)      [>]    |
|                                      |
| Playlists                            |
| Wednesday rehearsal            [>]   |
| Easter service set             [>]   |
|                                      |
| [art] Wednesday rehearsal      [>]   |
| Home        Search      Library      |
+--------------------------------------+
```

Why: Tracks, loops, and playlists stay adjacent but distinct, which mirrors how music apps separate collection types while keeping a single library destination.

## Screen 5: Loop Builder

### State A: Marker Capture

```text
+--------------------------------------+
| < Loop Builder                 Save  |
| Source: Gloria - Alto guide          |
|                                      |
|           [ cover art ]              |
|                                      |
| Current time                    1:24 |
| 0:00 -------o------------- 3:42      |
|                                      |
| [ Play ] [ Pause ] [ Set start ]     |
| [ Replay ] [ Set end ] [ Preview ]   |
|                                      |
| Selected range                        |
| Start                           1:12 |
| End                             1:28 |
|                                      |
| Loop name                             |
| [ Gloria entrance cue___________ ]   |
|                                      |
| Tip: play the saved track, pause on  |
| the exact moment, then capture start |
| and end.                             |
+--------------------------------------+
```

Why: This state makes loop creation a playback-first interaction. The user hears the track, captures the current playhead as start or end, then names the segment without leaving context.

### State B: Validation / Correction

```text
+--------------------------------------+
| < Loop Builder                 Save  |
| Gloria entrance cue                  |
|                                      |
| Start marker                    1:28 |
| End marker                      1:12 |
| LOOP LENGTH                       -- |
|                                      |
| 1:12 ---- end ----- start ---- 1:28  |
|                                      |
| Current time                    1:24 |
| Play the source again to capture a   |
| corrected start or end marker.       |
|                                      |
| Warning                              |
| End must be after start.             |
| Resume playback and capture again.   |
|                                      |
| [ Set start again ] [ Set end again ]|
+--------------------------------------+
```

Why: This validation state shows that loop creation is not only about happy-path capture. The user needs immediate feedback when the range is incomplete or invalid and a fast path back to correction.

## Screen 6: Playlist Detail

```text
+--------------------------------------+
| < Wednesday rehearsal          [...] |
| 12 items | 34 min | Personal         |
| [ Play ] [ Shuffle ] [ Add items ]   |
|                                      |
| Up first                              |
| 1. Warmup vowels                [=]  |
| 2. Kyrie entrance loop          [=]  |
| 3. Gloria - Alto guide          [=]  |
| 4. Psalm 42 full mix            [=]  |
|                                      |
| Edit mode                             |
| Remove, reorder, rename              |
|                                      |
| [art] Warmup vowels             [>]  |
| Home        Search      Library      |
+--------------------------------------+
```

Why: The playlist detail page centers play intent and item order, which is the core mental model for rehearsal queues.

## Screen 7: Now Playing

```text
+--------------------------------------+
| v                            [queue] |
|                                      |
|           [ cover art ]              |
|                                      |
| Kyrie entrance loop                  |
| From Wednesday rehearsal             |
| LOOP 0:42 - 1:06                     |
|                                      |
| 0:51 -----------o--------- 1:06      |
|                                      |
| [shuffle] [prev] [pause] [next] [rpt]|
|                                      |
| [ Save ] [ Add to playlist ] [ Share]|
|                                      |
| Up next: Gloria - Alto guide         |
+--------------------------------------+
```

Why: The full playback view gives the active item a strong emotional center while keeping loop context and the next queue decision visible.

## Screen 8: Queue / Up Next Sheet

```text
+--------------------------------------+
| Up Next                        Done  |
| Repeat: Playlist   Shuffle: On       |
|                                      |
| Now playing                           |
| Kyrie entrance loop             ||   |
|                                      |
| Next                                  |
| Gloria - Alto guide             [=]  |
| Psalm 42 full mix               [=]  |
| Amen cadence rehearsal          [=]  |
|                                      |
| Remove from queue                     |
| Reorder without stopping playback    |
+--------------------------------------+
```

Why: Queue control belongs close to now playing, preferably as a sheet or adjacent screen, so users can adjust the session without abandoning playback context.
