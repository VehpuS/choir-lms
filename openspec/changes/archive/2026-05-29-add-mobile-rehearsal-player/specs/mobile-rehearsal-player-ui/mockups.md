# Mobile Rehearsal Player UI Mockups

These low-fidelity wireframes describe a rehearsal-first mobile interface that borrows proven interaction patterns from modern music apps without copying any single product's layout or styling. Because the core media is metadata-poor rehearsal stems, the playback UI uses SoundCloud-style waveforms instead of square album artwork.

## UX Principles

- Keep discovery and ownership separate: Google Drive browsing is for finding material, while Library is for saved rehearsal structures.
- Preserve playback context: a global audio engine and persistent mini-player keep the current session visible across destinations.
- Make action density intentional: each row should expose the next likely action without turning into a control panel.
- Treat the waveform as the hero: stems do not rely on square artwork, so simplified and interactive waveforms carry playback identity and progress.
- Keep queue state close to playback: users should reach Up Next in one tap from the dedicated playback modal.
- Favor scan-first layouts: short sections, segmented collections, and strong hierarchy beat dense settings-heavy screens.
- Keep loop capture audible: users should mark loop boundaries from real playback context, not from raw timestamp fields alone.
- Preserve rehearsal cues: loop badges, source labels, and playlist context should stay visible when they affect playback behavior.

## Control and Icon Notes

- Continuous audio adjustments use a dual-thumb range slider in Loop Builder, direct horizontal scrubbing across the waveform in the dedicated playback modal, and a speaker-annotated volume slider when in-app volume is shown.
- ASCII placeholders such as `[queue]`, `[prev]`, `[skip-15]`, `[pause]`, `[skip+15]`, `[next]`, `[repeat]`, `[speaker]`, `[wave]`, `[marquee]`, and `[...]` represent platform system symbols or waveform states with explicit active, muted, disabled, or destructive states.
- Use one icon vocabulary across mini-player, queue, playlist, and library rows so playback, management, and removal affordances stay visually distinct.

## Component A: Global Mini-Player

```text
+--------------------------------------+
| [wave~~~~] Gloria - Alto g...  [||]  |
| Tenor 1 Stem                         |
| Home        Search      Library      |
+--------------------------------------+
```

Why: The mini-player stays visible above bottom navigation whenever the audio engine has an active item. The waveform replaces square artwork, the compact body opens the dedicated playback modal, and overflow text can switch from truncation to marquee only while audio is actively playing.

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
| [wave~~~~] Gloria - Alto g...  [||]  |
| Home        Search      Library      |
+--------------------------------------+
```

Why: This screen opens with a browse-first surface, gives quick pivots into Drive roots, and keeps the active listening session present through the global mini-player above navigation.

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
| [wave~~~~] Warmup vowels        [>]  |
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
| Kyrie - Alto rehearsal   [>]  [...]  |
| Kyrie - Alto entrance loop [>] [...] |
| Kyrie sectional playlist       [>]   |
|                                      |
| Matching folders                      |
| Shared / Easter / Kyrie         >    |
|                                      |
| Recent searches                       |
| kyrie | amen cadence | vowels        |
|                                      |
| [wave~~~~] Kyrie - Alto ...    [||]  |
| Home        Search      Library      |
+--------------------------------------+
```

Why: Search prioritizes low-friction scanning and immediate action, with row-level More Options affordances that can open playlist-management flows without leaving the results context.

## Screen 4: Library

```text
+--------------------------------------+
| Your Library                    [+]  |
| [Tracks] [Loops] [Playlists]         |
| Sort: Recently used             [v]  |
|                                      |
| Saved tracks                         |
| Gloria - Alto guide      [>]  [...]  |
| Psalm 42 full mix        [>]  [...]  |
| Warmup vowels            [>]  [...]  |
|                                      |
| Saved loops                          |
| Kyrie entrance (0:42-1:06) [>] [...] |
| Amen cadence (2:10-2:28)   [>] [...] |
|                                      |
| Playlists                            |
| Wednesday rehearsal            [>]   |
| Easter service set             [>]   |
|                                      |
| [wave~~~~] Wednesday reh...    [>]   |
| Home        Search      Library      |
+--------------------------------------+
```

Why: Tracks, loops, and playlists stay adjacent but distinct, while the row-level More Options affordance gives saved items a clear path into playlist management without forcing a dedicated editor screen.

## Screen 4A: Track Context Sheet

```text
+--------------------------------------+
| Your Library                         |
| ... dimmed track list ...            |
|                                      |
| ------------------------------       |
| Gloria - Alto guide                  |
| Saved track • 3:42 • Alto section    |
| Spring Concert / Full Mixes          |
|                                      |
| Add to playlist                 >    |
| Cancel                               |
+--------------------------------------+
```

Why: The context sheet keeps the row lightweight until the user asks for management actions, then confirms the selected track before starting the add flow.

## Screen 4B: Playlist Selector Modal

```text
+--------------------------------------+
| Your Library                         |
| ... dimmed behind overlay ...        |
|                                      |
| +------------------------------+     |
| | Add to playlist              |     |
| | Wednesday rehearsal      >   |     |
| | Easter service set       >   |     |
| | Alto warmups             >   |     |
| |                              |     |
| | + New playlist               |     |
| | Cancel                       |     |
| +------------------------------+     |
+--------------------------------------+
```

Why: The selector behaves like a familiar mobile overlay with a scrollable playlist list, which lets the user finish the add action without losing the surrounding library or search context.

## Screen 4C: New Playlist Prompt

```text
+--------------------------------------+
| Your Library                         |
| ... dimmed behind prompt ...         |
|                                      |
| +------------------------------+     |
| | New playlist                 |     |
| | [ Wednesday rehearsal 2___ ] |     |
| |                              |     |
| | Create                       |     |
| | Cancel                       |     |
| +------------------------------+     |
+--------------------------------------+
```

Why: A lightweight text prompt keeps playlist creation inside the add flow so the user can name the playlist, assign the track, and return to browsing in one step.

## Screen 5: Loop Builder

### State A: Marker Capture

```text
+--------------------------------------+
| < Loop Builder                 Save  |
| Source: Gloria - Alto guide          |
|                                      |
|         [ waveform view ]            |
|                                      |
| Current time                    1:24 |
| Playhead slider                      |
| 0:00 -------o------------- 3:42      |
| Loop range slider                    |
| 0:00 ----|=====|---------- 3:42      |
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

Why: This state makes loop creation a playback-first interaction. The user hears the track, captures the current playhead as start or end, then refines the saved bounds on a dual-thumb slider and names the segment without leaving context.

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
| Loop range slider                    |
| 0:00 ---- end -- start ---- 3:42     |
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

Why: This validation state shows that loop creation is not only about happy-path capture. The user needs immediate feedback when the slider range is incomplete or invalid and a fast path back to correction.

## Screen 6: Playlist Detail

### State A: Playback-First Detail View

```text
+--------------------------------------+
| < Wednesday rehearsal          Edit  |
| 12 tracks | 34 min | Personal        |
|                                      |
| 1. Warmup vowels               [...] |
| 2. Kyrie entrance loop         [...] |
| 3. Gloria - Alto guide         [...] |
| 4. Psalm 42 full mix           [...] |
|                                      |
|                            (PlayAll) |
|                                      |
| [wave~~~~] Kyrie entrance...   [||]  |
| Home        Search      Library      |
+--------------------------------------+
```

Why: The default playlist view treats the playlist as a queue first: the title and count frame the session, row taps can start playback from a chosen index, and a floating primary action keeps full-playlist playback prominent without crowding the header. Repeat and shuffle stay off this screen so users change them from playback context after the queue is already running.

### State B: Playlist Item Menu and Undo Feedback

```text
+--------------------------------------+
| < Wednesday rehearsal          Edit  |
| 12 tracks | 34 min | Personal        |
|                                      |
| 3. Gloria - Alto guide         [...] |
| ------------------------------       |
| Gloria - Alto guide                  |
| In Wednesday rehearsal               |
| Remove from playlist           !     |
| Cancel                               |
|                                      |
| Gloria - Alto guide removed   [Undo] |
| [wave~~~~] Kyrie entrance...   [||]  |
+--------------------------------------+
```

Why: Removal stays local to the playlist detail surface. The row menu exposes a destructive action for that playlist membership only, and the snackbar keeps undo close at hand without kicking the user into a separate editor.

### State C: Edit Mode

```text
+--------------------------------------+
| < Wednesday rehearsal          Save  |
| Edit playlist                        |
|                                      |
| [x] Warmup vowels               [=]  |
| [x] Kyrie entrance loop         [=]  |
| [x] Gloria - Alto guide         [=]  |
| [x] Psalm 42 full mix           [=]  |
|                                      |
| Drag to reorder. Remove affects      |
| this playlist only.                  |
|                                      |
| Home        Search      Library      |
+--------------------------------------+
```

Why: Edit mode is clearly separate from playback mode. Playback affordances disappear, drag handles and destructive controls take over, and save becomes the explicit exit that commits the new ordered playlist indexes.

## Screen 7: Dedicated Playback Modal (Now Playing)

### State A: Individual Track Playback

```text
+--------------------------------------+
|                [pill]                |
| Rehearsing: Kyrie                    |
|                                      |
| [wave active======== mute-----]      |
|                                      |
| Kyrie entrance loop                  |
| Tenor 1 Stem                         |
| LOOP 0:42 - 1:06                     |
|                                      |
| 0:51                          1:06   |
|                                      |
|      [skip-15] [pause] [skip+15]     |
|                                      |
| Repeat: Loop                         |
| [speaker] ----o------------- [max]   |
+--------------------------------------+
```

Why: Standalone playback keeps the modal focused on the current stem or loop. Rehearsal skip jumps stay close to play / pause, while queue-only controls stay hidden because there is no playlist context to move through.

### State B: Playlist / Queued Playback

```text
+--------------------------------------+
|                [pill]                |
| Rehearsing: Kyrie             [queue]|
|                                      |
| [wave active======== mute-----]      |
|                                      |
| Kyrie entrance loop                  |
| 3 of 12 • Tenor 1 Stem               |
| From Wednesday rehearsal             |
|                                      |
| 0:51                          1:06   |
|                                      |
| [prev]                    [next]     |
|      [skip-15] [pause] [skip+15]     |
|                                      |
| Repeat: Playlist   Shuffle: Off      |
| [speaker] ----o------------- [max]   |
+--------------------------------------+
```

Why: Queued playback keeps the same current-item skip controls for rehearsal work, but adds previous / next item navigation and a queue affordance because playlist context is now relevant. This keeps both interactions available without showing queue navigation on standalone tracks, and it keeps repeat and shuffle close to the active session instead of burying them back on playlist detail.

## Screen 8: Queue / Up Next Sheet

```text
+--------------------------------------+
| Up Next                        Done  |
| Repeat: Playlist   Shuffle: On       |
|                                      |
| Now rehearsing                        |
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

Why: Queue control belongs close to the dedicated playback modal, preferably as a sheet or adjacent screen, so users can adjust the session without abandoning playback context or overloading the main transport row. That includes seeing and changing the active repeat and shuffle mode while playback is already in progress.
