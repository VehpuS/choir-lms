# Choir LMS

Choir LMS is an Nx-based monorepo for building a suite of tools that help choirs organize learning materials and make rehearsal preparation more effective.

The long-term goal is a broader choir learning platform that can bring together storage integrations, rehearsal materials, collaboration workflows, and role-specific tools for singers, section leaders, and directors. The first product slice is narrower by design: a mobile rehearsal player that turns shared audio into repeatable personal practice sessions.

## Vision

Choirs often already have the raw material they need for self-rehearsal, but it is scattered across shared drives, folders, and messages. This project aims to add a rehearsal-focused layer on top of those existing assets so choir members can spend less time searching and more time practicing.

At a high level, the platform is intended to support:

- integration with existing storage systems, starting with Google Drive
- audio, document, schedule, and rehearsal material access from a unified product surface
- practice-specific workflows such as saved loops, playlists, annotations, and guided rehearsal content
- future expansion into broader choir operations and learning workflows

## First Product Slice

The current focus is a mobile-first rehearsal player built with React and intended for native-feeling mobile playback.

For the MVP, the player is expected to support:

- browsing and playing audio files from Google Drive
- marking start and end points on a track and saving them as named loops
- adding full tracks and saved loops into playlists
- ordered playback, repeat, and shuffle for rehearsal sessions
- lyrics saved with a track and read during playback (see [Lyrics](#lyrics))
- optional sheet music links per track, opened in a full-screen viewer (see [Sheet music](#sheet-music))
- named markers at points of a track, shown as flags on the waveform, that jump playback and turn into loops (see [Markers](#markers))
- a piano for checking pitches against the track and the score (see [Piano](#piano))
- pitch detection that shows the note you sing, in tune or not, against the piano and the score (see [Pitch detection](#pitch-detection))
- rehearsal recordings: sing over a playing track, hear the take back with the track, and export it (see [Recording](#recording))
- a landscape layout for a phone held on its side: a side rail, a Now Playing pane, two-column playback and practice tools that leave the content its height (see [Landscape layout](#landscape-layout))
- native mobile transport integration where practical, including background playback and lock-screen controls

The MVP explicitly does not include offline playback, document collaboration, score annotation, or broader rehearsal management workflows.

## Landscape layout

A phone held on its side is wide and short (about 750 to 930 points by 340 to 400), so the app switches to a layout that spends width instead of height. It is chosen from the window size (`getLayoutClass`, in `src/app/routing/shell/layout-class/`): `compact` below 600 points wide, and `wide-short` at 600 or more wide and under 500 high. A 40-point band around the thresholds keeps the browser's chrome or the soft keyboard from flipping it, and everything else reads the class through `useLayoutClass`. A tablet or a desktop window is `compact`, as is a phone upright. Every action in `compact` stays available in `wide-short`. The web build fills the dynamic viewport, with `viewport-fit=cover` and the safe areas respected (a Dynamic Island on either side, the home indicator), including in sheets, dialogs and the viewers.

In `wide-short`:

- **Side rail:** Library, Add, Recents and `Tools` stack on the leading edge instead of the bottom tabs. The Library's add button moves from floating over the list to the header.
- **Now Playing pane:** in place of the mini-player, a 280-point pane on the trailing side shows the title, progress, previous / play / next, speed, pitch and loop, and opens the full playback view when you tap anywhere on it that is not a control or drag it up (a small handle at its top says so). There is no pane while nothing plays.
- **Playback view:** two columns. The waveform, transport and the speed, pitch, repeat and shuffle tiles stay on the left; `Lyrics`, `Mix` (a composite), `Queue` and `Speed & pitch` are tabs on the right.
- **Sheets and menus:** a bottom sheet is a trailing side sheet (380 points wide, full height, scrolling inside). The account menu card scrolls inside the window. The loop editor stays a bottom sheet but is two columns: the waveform with its A and B handles and the preview transport on the left, the Start / Length / End steppers, the name field and Save on the right, so nothing needs a scroll.
- **Practice tools:** `Pitch detection` and `Recording` open in a trailing panel that takes the pane's place while either is on, so they take no height; the pane returns when they close, and playback is not affected. The piano is a 34-point bar over 104-point keys at the bottom of the content, right of the rail, and has a `Full screen` button: full screen hides the rail, pane and content, fills the window below a slim bar (volume, key width, the sung note, an optional `Auto-hide`, exit, close), is remembered on the device, and shows a chip with the playing title and a pause control. Over the full playback view the piano is always full screen, since it cannot share the window with that view, and Pitch and Recording are one small card you can drag anywhere in the window (it floats in the lower trailing corner at first, collapses to a pill showing the take's clock and the sung note, and stays inside the safe areas). In the sheet music viewer the piano is the compact bar and the pitch monitor a slim row, so the score keeps its height.
- **Lyrics reading mode:** the text size, play / pause and close share the title row.
- **Keyboard:** on the web a sheet or dialog with a text field pads by the soft keyboard's height (read from `visualViewport`) and scrolls the focused field into view.

The browser scenarios `layout-classes` (which also guards what must stay unchanged upright), `landscape-*` and `keyboard-safe-inputs` cover this in the default lane, and `landscape-device-matrix` runs it on emulated iPhone and Pixel phones on their side in the matrix lane (see `tools/browser-session/README.md`). The design, with captured screens and a mock, is in `openspec/changes/landscape-mobile-layout/`. The piano's keyboard-and-key-height details are under [Piano](#piano).

## Lyrics

A saved track can hold one body of plain-text lyrics, stored with the track in the on-device library like its tags. Loops and adjusted tracks do not keep their own copy: they show the lyrics of the track they came from, and removing a track removes its lyrics.

- **Adding lyrics:** open `Lyrics` (or `Edit lyrics`) from any track, loop, or playback menu. Type or paste text, use `Search <source>` (Google by default) to open a search for the title and artist in the system browser, with a dropdown for the other sources in `Settings`, or use `Look up` to fetch suggestions.
- **Where lookup comes from:** `Look up` asks the open [LRCLIB](https://lrclib.net) service. It runs only when you tap it, after a one-time notice on the device, and sends the title, artist, and track length you see in the editor, nothing else. Results are suggestions: you review and can edit them, and nothing is saved until you press `Save`. Timed (synced) lyrics are ignored.
- **Privacy and copyright:** saved lyrics stay on the device; the app never uploads or shares them. Looked-up text is third-party content that you choose to keep in your own library, and the lyrics service's own terms apply to the lookup.
- **Reading:** the playback screen has a Lyrics section, the mini-player shows a `Lyrics` control while the playing item has lyrics (a half-height peek), and `View` / `Expand` opens a full-screen reading mode. One text-size setting (`Small` to `Extra large`) applies to all three.

## Sheet music

A saved track can carry up to 10 sheet music sources, such as the full score and one part. The app stores only a link (a Google Drive file or a web address), a label, and the chosen parts; it never copies, hosts, or uploads a score. Loops and adjusted tracks show the sources of the track they came from, and removing a track removes its links.

- **Reaching it:** `Sheet music` in any track, loop, or playback menu (after `Lyrics`) opens a manager sheet. There is no sheet music section on the playback screen. `View` opens a full-screen viewer with a play/pause control, and the screen stays awake.
- **Adding:** `From Google Drive` (a picker that shows only PDF, MusicXML, MIDI, and MuseScore files), `From a web link` (pasted, detected, validated), or `Search <source>` (MuseScore by default; opens a prepared search in the system browser, with a dropdown for IMSLP, a web PDF search, and any source you add). The sources are two ordered lists in `Settings`, `Score search` and `Lyrics search`: reorder them (the first is the default), remove all but one, add a built-in back, or add your own `https` address with `{query}`, `{title}`, or `{artist}` where the search goes. The app only opens these addresses in the system browser; it never fetches from them.
- **Formats:** PDF is drawn as pages on the web build, in one of four layouts chosen with the viewer's `Layout` button: `Scroll` (a column of pages fitted to the width, the default), `Pages` (one whole page at a time, turned by swiping, the arrow keys, `Page Up`/`Page Down`, the wheel, or `Previous page` and `Next page` beside the page indicator, snapping to each page, with no sideways scrollbar; the keys and buttons slide briefly, instantly if the device asks for reduced motion), `Strip` (every page side by side in one row that scrolls sideways, each as tall as the viewer), or `Spread` (two pages side by side, page 1 with page 2, turned a spread at a time and snapping like `Pages`; offered only while the viewer is at least 760 px wide, so a landscape tablet or desktop window, and shown as `Pages` on the same page when the window narrows, without losing the choice). `Page 3 of 81` shows in every layout (a wide `Strip` or a `Spread`, where several pages show side by side, reads `Pages 3-5 of 81`; on a phone held sideways it moves into the side rail as `3/81` between `Previous page` and `Next page`, and the rail scrolls when the controls do not fit) and is a button: it opens `Go to page`, a sheet with a page-number field (and `Go`) above a grid of page thumbnails, drawn a few at a time as you scroll, and choosing a number or a thumbnail moves the viewer to that page. Changing layout, zooming, or turning the phone keeps the page you are on, and a new layout starts at its fit (zoom returns to 100%). After a sheet closes or a toolbar button is used, the arrow keys still turn pages. The layout you choose is remembered for the device; turn on `Only for this file` in the sheet to give one file its own layout (saved on that source, and `Use the device layout` removes it). Zoom runs from 50% to 400% in every layout (100% fits the width in `Scroll`, the whole page in `Pages`, the height in `Strip`, and the whole pair in `Spread`) by the buttons, a pinch, `Ctrl`/`Cmd` + wheel, or a double tap, and keeps the point under your fingers in place; a zoomed `Pages` or `Spread` view pans freely and snaps again at 100%. Native iOS and Android do not draw PDFs yet. MusicXML (`.musicxml`, `.xml`, `.mxl`) is drawn as staves in one strip that scrolls sideways, shrunk to fit the height you have (never below 50%) until you zoom by hand; `Fit to height` brings that back. MIDI is converted to MusicXML on the device and drawn the same way; part names are read from the file (including exporters that name a track in the empty track before it), a pickup is found from where the long notes land, time and key signature changes are followed bar by bar, a drum or beatbox track is drawn on a percussion staff and counts as a vocal part, runs of 32nd notes are recognized, and a short gap between notes is kept as a rest rather than closed, but the notation is approximate, performed (not score-exported) MIDI will look rough. Every MIDI file is drawn as it is, whatever it holds (a Performous game file shows as stacked chords); the app does not judge whether a file is useful. MuseScore files (`.mscz`, `.mscx`) and `musescore.com` pages are not rendered: they open outside the app, so export MusicXML from MuseScore to view a score here. The app never fetches from musescore.com. **Finding your place:** `Go to` in the viewer's controls opens a drawer over the left of the score with a bar-number field (the number printed on the score), the file's rehearsal marks as a tap-to-jump list, and the part names in staff order; it takes no room while you read. Tapping a staff shows its part's name for a moment. A long score (over 96 bars) is drawn in runs of bars as you scroll, so any length works and a short arrangement is drawn in one piece.
- **Parts:** for MusicXML and MIDI the viewer shows the vocal parts by default (a part is hidden only when it is known to be instrumental). `Vocal parts`, `All parts`, and per-part chips change the choice, and it is remembered per source. A PDF has no parts.
- **Your parts:** Settings has an ordered `Your parts` list (Soprano, Mezzo-soprano, Alto, Tenor, Baritone, Bass, Beatbox, or any name you type, such as `Lead` or `Alto 2`), reordered by dragging or with the arrows. A source with no saved choice of its own opens on the first listed part the score has: every name is tried for an exact match first (digits count, so `Alto 2` finds only `Alto 2`), then for a close match (`Alto` also finds `Alto 1` and `Alto 2`; instrumental parts are never suggested), and only that part's staves show. With nothing listed, or nothing matching, it follows the exact part you last showed alone with the chips, then falls back to the vocal parts. `Make <Part> my part` in the viewer puts the exact part showing at the top of the list, and pressing it again removes it. A part saved on a source always wins. The list is stored on the device, not per track.
- **What is fetched, and when:** a file is downloaded only when you open it, with your existing Google authorization for Drive files, or directly from the address for a web link. On the web build, a host that does not allow browser requests shows `Open in browser`; saving the file to Drive always works. The renderers (OpenSheetMusicDisplay, pdf.js, a MIDI parser) are separate chunks loaded when a viewer opens, not at startup. Nothing is uploaded.
- **Not yet:** the iOS and Android renderers are tracked in `native-playback-follow-ups`; until then a native build lists the sources and opens them outside the app.

## Markers

A saved track can hold up to 200 named markers, such as `Verse 2` or `Bridge`, each at a point in the audio. They are stored with the track like its tags and lyrics. Loops and adjusted tracks show and edit the markers of the track they came from (positions are in the original audio's time, so speed and pitch shaping never move them), and removing a track removes its markers. Markers are not library entries: they do not appear in Files, search, tags, or playlists.

- **Reaching them:** `Markers` in any track, loop, or playback menu (after `Sheet music`) opens a list for the owning track; opened from a loop it shows only the markers inside that loop. The playback menu also has `Add marker here`.
- **Adding:** `Add marker here` takes the playhead, or long-press the playback waveform to add at the pressed point. A new marker is named `Marker N`; a confirmation offers `Rename`. Each row's menu has `Rename`, `Move` (nudges, `Set to current position`, or a typed `mm:ss.s`), and `Delete` with undo.
- **Loop boundaries:** every saved loop shows `<name> start` and `<name> end` rows, computed from the loop, so they follow edits and disappear with the loop. They are read-only; `Keep as marker` copies one into your own markers. `My markers` hides them (the choice is remembered on the device and also filters the waveform flags).
- **Jumping:** tap a row, or a flag on the waveform, to seek there while playing or paused; from the library it loads the track and starts at the marker. A marker past the end of a replaced, shorter audio file is greyed and not jumpable but is kept.
- **Flags:** the playback waveform draws your markers as accent hairlines with a small head and loop boundaries as shorter dim ticks; press one to see its name, long-press it for its row actions.
- **Markers to loops:** `Loop to next marker` on a row, `Select` two markers then `Make loop`, or `Create loops from markers` (one loop per section between your markers, named after the start marker, with an optional `Intro`). All open or use the normal loop editor and save operation.
- **In the loop editor:** your markers (never loop starts or ends) are drawn on the editor waveform (`Hide markers` / `Show markers` toggles them); tap the flag button on the Start or End card to choose that edge from the list, or tap the card and then a flag. Markers the armed edge cannot take (a start at or after the end, or an end at or before the start) are dimmer and listed separately; choosing one asks whether to move the other edge to the track start or end, pick another marker, or cancel. Markers are read-only there.

## Piano

A singer checking a pitch can open an 88-key piano (A0 to C8) over the app without leaving the track or the score. It is a web-only capability for now: native has no piano sound, so its controls are absent there (tracked in `native-playback-follow-ups`).

- **Opening it:** the `Practice tools` menu (the tab bar item, the playback screen header, and the sheet music viewer's controls all open the same menu; it needs no track, so it works before anything has played and after playback ends), It docks above the mini-player and tab bar (under the score in the viewer, where the score area shrinks to fit), never pauses, ducks, or moves the track, and remembers whether it is open, its height, where it was scrolled, and (in landscape) whether it is full screen. Drag its handle to one of three heights; on a phone held sideways it is a fixed compact keyboard with a `Full screen` option instead (see [Landscape layout](#landscape-layout)); `Close piano` closes it everywhere.
- **Playing:** keys sound while held, with several fingers at once, and sliding across keys plays a glissando. A touch that begins on a key plays and never scrolls; the strip beneath the keys, a labelled map of the octaves (C1 to C8), scrolls the keyboard. Notes are concert pitch (A4 = 440 Hz) and do not follow the track's pitch shaping. It opens on middle C, or on the range of the part shown in the sheet music viewer. C keys carry their octave (`C4`).
- **Computer keyboard:** with the piano open on a desktop browser, the `A S D F G H J K L ;` row plays the white keys from middle C and the `W E T Y U O P` row the black keys; `Z` and `X` move an octave down or up. Shortcuts and typing in text fields are left alone.
- **Tapping the score:** tapping a notehead in MusicXML or MIDI sheet music sounds its pitch (at least 350 ms) and lights the key; a part's transposition is applied, rests and tied continuations do nothing, and a PDF is not tappable.
- **Settings:** a list of categories (`Bulk selections`, `Piano`, `Pitch detection`, `Microphone`, `My parts`, `Search sources`, and `Offline storage` where audio can be stored), each opening its own page; back or Escape returns to the list. The `Piano` page chooses the sound (`Piano` is a synthesized tone for now; recorded samples are planned, `Organ` is a simple oscillator), whether every key is named, and how black keys are spelled (sharps or flats). The piano's volume is in its handle row and is separate from the track's.

## Pitch detection

A singer can turn on the microphone and see the note they are singing, how far it is from the nearest note in cents, and whether that is precise, near, a quarter tone off, or off pitch (always stated in words as well as colour). Like the piano it is web-only for now: native has no microphone capture, so its controls are absent there (tracked in `native-playback-follow-ups`).

- **Turning it on:** `Pitch detection` in the `Practice tools` menu. The first `Listen` explains why the microphone is needed before the browser asks. Nothing you sing is recorded, stored, or sent anywhere; it assumes headphones, because sound from speakers reaches the microphone and is detected like singing.
- **Monitor strip:** the note, a cents gauge, and a short history, docked above the piano or the mini-player (in the trailing panel on a phone held sideways). It remembers whether it is on, and shows idle, blocked, paused (while the app is in the background), and interrupted states, recovering by itself when the microphone returns.
- **Pitch view:** the strip's expand button opens a full-screen view with a large readout, a focus panel tracing closeness to a target (the nearest note, or one you hold), and a progression roll you can zoom from about 5 to 60 seconds. It has a landscape layout and does not touch playback.
- **Minimum volume:** sounds quieter than a cutoff (-60 to -20 dB, default -40) are ignored. Set it from the Pitch view's settings sheet or the `Pitch detection` page in Settings, over a live level meter, so it sits just above the room noise.
- **Which microphone:** when more than one input is connected, the first start asks which to use (the system's choice, or an input by name), with `Remember my choice`. The `Microphone` page in Settings shows the remembered input, changes it, or goes back to `Ask each time`; an input that is not connected stays listed, and the system's choice is used until it returns. It applies to pitch detection and recording alike. Choosing the phone's own microphone may keep Bluetooth earbuds on their high-quality output (an earbud microphone makes iOS switch them to a thin hands-free mode); the page cannot set that itself.
- **On the piano and the score:** the sung key lights up (with an edge pill pointing to it when it is off screen), and in MusicXML or MIDI sheet music the matching noteheads are marked. A transposing part is handled, and while the playing track is shifted in pitch the score follows the shifted note and says `Following track pitch ±N st`. `Show other-octave matches` (a toggle in the sheet music viewer's toolbar, shown only beside a score) also marks the same note in other octaves. A PDF is never marked.

## Recording

A singer can record their own voice over a playing track, then play the take back together with the track to check timing, blend and entrances. Like pitch detection it is web-only for now: native has no microphone capture, so its controls are absent there (tracked in `native-playback-follow-ups`).

- **Turning it on:** `Recording` in the `Practice tools` menu. The first `Record` explains that audio is kept on this device until you delete it, and assumes headphones. Recording stops, keeping what was captured, when you stop it, the app goes to the background, the microphone ends, the track ends, or storage runs low; the reason is shown.
- **What a recording is:** a child of the track or loop it was made on, not a library file. It stores a timeline that maps its audio to track positions (so seeks, pauses and loop passes are kept) plus the speed, pitch, markers and loop in play, enough to rebuild the overlay and a mix later. Speed and pitch are fixed while recording and while playing a recording back.
- **Where they are:** `Recordings` in the playback screen's `More actions` menu (this track or loop), and the `Recordings` view in the Library (all of them, with search, filters, sort and bulk actions). Recordings can be queued and added to playlists, and a recording opens its track in the context it was made in.
- **Storage:** 16-bit mono WAV in its own IndexedDB store that nothing clears automatically; only you delete a recording. Settings and the offline files view show the space used, and the strip shows the time left once under 30 minutes.
- **Playing it back:** the recording plays through Web Audio over the track's own media element and stays in step through play, pause, seek and loop wrap, with a balance control and a latency `Nudge` that can be saved per output device, or measured with the click calibration.
- **Export:** the recording alone or a mix over the original track as it was heard, to a download or to Drive (resumable upload, so long files work). Automatic export of copies to Drive is off by default and set under `Settings`, `Recordings`: a folder, recording or mix or both, and Wi-Fi only; the queue runs while the app is open, and deleting a recording never deletes its Drive copies.
- **Punch ranges:** `Between…` beside `Record` opens a sheet with the waveform; set `In` and `Out` by dragging (snapping to markers and loop ends), tapping marker flags or typing times, choose a pre-roll, and `Arm`. Playing from the pre-roll counts down and the take starts and stops by itself. A range from `Use active loop` is saved as a loop recording.

The sync, mixing and punch logic is in `packages/audio-mixing`; the app side is `packages/mobile-rehearsal-player/src/app/library/recording/`. The overlay path is described in `docs/mobile-cross-platform-audio-playback.md`.

## Composite tracks

A composite plays several stems (one track per voice) together as one item, so a singer can mute their own part, hear the others and rehearse against them. Like recording it is web-only for now.

- **Making one:** select two or more tracks in the Library (the Tracks or the Files view) and choose `Make composite…`. The sheet names it, names each stem, and picks where it is saved (`Save in`). A composite is a file in the Library like a track, loop or playlist; it also has a `Composites` view, a row badge (`Composite · 4 stems`), search, Recents, playlists and the queue.
- **The Mix panel:** on the playback screen, a row per stem with mute, solo and a 0 to 150% level, `Your part` for the stem that is yours, built-in presets (`All parts`, `Without <your part>`, `<Your part> louder`), saved presets, a default mix and `Reset`. A stem whose track is gone shows `Stem missing`. Speed and pitch apply to the whole mix.
- **First play:** each stem is prepared once (`Preparing stems · first time only`) and kept on the device, so later opens are quick. The offline files view lists `Prepared composites` and `Clear all` clears them; a full device says so and offers `Clear offline files…`.
- **Lyrics and sheet music:** read from the stems. Sheet music is the combined list (each file once, with who uses it, and files you add to the composite); lyrics show the stem you pick.
- **Export:** `Export…` renders the current mix, speed and pitch as a 16-bit WAV, to a download or to Drive.

The mixing, offline render and mix logic are in `packages/audio-mixing`, the record and its rules in `packages/audio-library-models`, and the app side is `packages/mobile-rehearsal-player/src/app/library/composite/`. The engine and the player wrapper are described in `docs/mobile-cross-platform-audio-playback.md`.

## Backup, restore and sharing

The library lives on the device, so it can be saved to Drive and handed to others as a **bundle**: one JSON file of the organization (folders, tags, loops, playlists, composites, markers, lyrics, sheet music links), never the audio. Audio stays on Drive and is found again by its Drive file id.

- **Back up library** (account menu): writes a dated bundle to `Choir LMS / Backups`; the five newest are kept and older ones go to the Drive trash after a new one is saved. Recordings are left out unless you choose them.
- **Restore from backup:** choose `Add to my library` (a new `Imported …` folder; nothing you have changes) or `Replace my library`. Replace first saves a backup of the current library, with all recordings, and stops if that fails; the swap is one commit and an interrupted swap is finished or rolled back on the next load. The safety backup is listed as `Before restore` and is the undo.
- **Share…** (folder menu): writes a bundle of the folder and the loops, playlists and composites that depend on it to `Choir LMS / Shares`. You can also include the items its playlists use from other folders. The app never changes Drive permissions: share the file in Drive yourself, and singers also need access to the audio files.
- **Import shared library** (account menu): lists bundles you own and those shared with you, previews what will be added, reused (same Drive file) and skipped, then adds them in a new folder. The folder is marked `Imported from <author>`.
- **Missing access:** a file you can't open is still imported and shown as unavailable. `Get access…` opens a guide that groups files by owner with `Open in Drive`, `Email owner`, `Copy list` and `Check again`.

Writing needs the `drive.file` scope; reading and importing need only the read-only scope. The format and parser are in `packages/audio-library-models` (`library-bundle*`), the builder, import planner, executor and `replaceLibrary` are in `packages/audio-library-runtime`, the Drive helpers are in `packages/google-drive` (`drive-library-bundle-*`, `drive-file-access`), and the app side is `packages/mobile-rehearsal-player/src/app/library/bundle/`. Recordings are uploaded on backup when chosen and, on the web, can be restored from Drive with a checkbox at restore or import time (off by default); a phone has no recordings store yet and says so. Playlist entries that play a recording travel with it when the recording is included; they are imported either way and play once the recording is restored.

## The web app

The web export is a progressive web app as well as the Pages deployment:

- **Install:** `public/manifest.webmanifest` (name, standalone display, the app colours, a maskable icon) with relative `id`, `start_url` and `scope`, so it works under any Pages base path. The icons are rendered from the SVG sources in `packages/mobile-rehearsal-player/assets/web-icons/` by `npx tsx tools/web-icons/render-web-icons.ts` into `public/icons/` (committed). They are composed from Phosphor glyphs; the notice is in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- **Back:** the browser's Back (Android gesture, browser button) closes the topmost sheet or menu instead of leaving the app (`src/app/components/back-stack/`).
- **Preferences:** sheets skip their slide or fade, and the mini-player's long title stops scrolling, under `prefers-reduced-motion` (`MotionModal`, `PlaybackMarqueeText`).
- **Storage:** keeping a file offline asks the browser for persistent storage once; the Offline files screen says when it refused.
- **Screen and lock screen:** the screen stays on while a track plays or a score or lyrics are open, and the browser's lock screen, notification and media keys show and drive playback (`components/wake-lock/`, `components/media-session/`; see the playback doc).
- **Security policy:** a Content-Security-Policy meta tag (GitHub Pages sends no headers), added to the exported page at build time (`tools/web-csp/inject-csp.ts`; the dev server needs `eval` and has none), limits script to the app's own origin plus `blob:` for the audio worklets. It cannot restrict outgoing requests, since people add audio and score links from anywhere. The Drive access token stays in `localStorage` for about an hour; the policy is the protection against a script reading it.

These came out of an audit against modern-web-guidance; the findings and decisions are in `openspec/changes/web-platform-modernization/`.

## Product Direction

This repository is intentionally scaffolded as an Nx workspace rather than a single app so the system can grow into a library of apps and shared packages over time.

The expected shape is:

- one or more user-facing applications under `packages/`
- shared domain and integration packages for media, storage, auth, and choir-specific workflows
- OpenSpec-driven change proposals to keep product scope and implementation aligned as the platform expands

The first change proposal for this direction is `add-mobile-rehearsal-player` under `openspec/changes/`.

## Repository Notes

- `packages/` is the workspace home for future apps and shared libraries
- `packages/pitch-detection` holds the framework-agnostic pitch-detection pipeline (estimator, gates, smoother, note segmenter); it is imported statically, unlike the lazily loaded `midi-notation`
- `packages/audio-mixing` holds the framework-agnostic recording and composite logic (clock-anchor fit, timeline builder, balance gains, sync controller, the offline mix renderer with its SoundTouch stretcher, the punch range model, state machine and controller, and for composites the stem gains, mix presets and session mix, and `renderComposite` with its SoundTouch sum shaper); the web `Transport` and `Voice` implementations and the composite engine live in the app
- Pitch detection third-party licences (both permissive, checked against the installed packages): `pitchy` 4.1.0 (MIT, Copyright 2018-2021 Ian Johnson; its README's licence section is copied from another project, the `LICENSE` file is the authority) and its dependency `fft.js` 4.0.4 (MIT, Copyright Fedor Indutny 2017)
- `openspec/` contains proposals, designs, specs, and tasks for planned work
- `nx.json` and the root TypeScript configuration provide workspace-level build and project settings
- `tools/web-icons/` renders the web app icons from their SVG sources; `THIRD_PARTY_NOTICES.md` carries the Phosphor Icons licence
- Cross-platform playback architecture details are documented in `docs/mobile-cross-platform-audio-playback.md`

## Development

This workspace uses npm workspaces with the committed root `package-lock.json`.
Prefer `npm exec -- <tool>` for local CLIs, especially `npm exec -- nx ...` for
workspace tasks.

Useful Nx commands:

```sh
npm exec -- nx show projects
npm exec -- nx graph
npm exec -- nx sync
```

### Testing

The currently implemented automated tests run through Nx `test` targets and execute with Node's built-in test runner using `tsx --test`.

- Test sources use `node:test` plus `node:assert/strict`. Mobile component specs render with `@testing-library/react-native/pure` through a small `src/test-support/` preload that maps `react-native` to `react-native-web`.
- Primary command pattern: `npm exec -- nx run <project>:test`.
- In this workspace, Jest and Vitest are not the active test harness for existing package tests.
- For targeted mobile test runs, use:
  - `npm exec -- nx run mobile-rehearsal-player:test-file -- --file=src/path/to/file.spec.ts`
  - `npm exec -- nx run mobile-rehearsal-player:test-pattern -- --pattern='src/**/*.spec.ts'`
- Browser tests drive the web export in Chromium against a mock library (no Google sign-in): `npm exec -- nx run mobile-rehearsal-player:browser-test`. Scenarios and the mock library tooling are described in [tools/browser-session/README.md](tools/browser-session/README.md); CI runs it in the `browser` job alongside the unit-level checks. Slow device and audio-quality scenarios are an opt-in lane (`browser-test-matrix`, the `Browser matrix` workflow or the `browser-matrix` PR label; `browser-matrix-webkit` and `browser-matrix-firefox` run the default lane in those browsers). Agents add or extend a scenario with every user-visible web change (`browser-test-coverage` skill).

### Google OAuth for mobile manual testing

The mobile rehearsal player reads Google Drive OAuth IDs from `packages/mobile-rehearsal-player/.env`.

For the default app identifiers in this repo:

- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` should be an iOS OAuth client for bundle ID `com.choirlms.mobile`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` should be an Android OAuth client for package `com.choirlms.mobile`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is only needed when running the app on web

The app asks Google for two Drive scopes: `https://www.googleapis.com/auth/drive.readonly` (browsing and playing files) and `https://www.googleapis.com/auth/drive.file` (saving a sheet music file to the user's Drive, the `Save to Drive` flow). The OAuth consent screen in the Google Cloud project must list both, and every account that signs in while the app is in Testing must be a test user. The console steps are in [design.md](openspec/changes/save-blocked-sheet-music-links-to-drive/design.md#google-cloud-console-setup-project-owner); no new client ID or `.env` value is needed.

To get the Android debug SHA-1 for local `expo run:android` builds:

```sh
keytool -list -v -alias androiddebugkey -keystore ~/.android/debug.keystore -storepass android -keypass android | grep SHA1
```

If `~/.android/debug.keystore` does not exist yet, generate the standard Android debug keystore first:

```sh
keytool -genkeypair -v -keystore ~/.android/debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
```

After filling the client ID for the platform you are testing, verify the Expo config and launch a dev build:

```sh
cd packages/mobile-rehearsal-player
npm exec -- expo config --type public
```

```sh
npm exec -- nx run mobile-rehearsal-player:run-ios
# or
npm exec -- nx run mobile-rehearsal-player:run-android
```

For deterministic local and CI validation, `npm exec -- nx run mobile-rehearsal-player:build` performs a local Expo export. Use `npm exec -- nx run mobile-rehearsal-player:eas-build` when you intentionally want to trigger an EAS build.

### GitHub Pages deployment

The repository includes [.github/workflows/deploy-mobile-web-pages.yml](.github/workflows/deploy-mobile-web-pages.yml) to export and deploy the mobile web app to GitHub Pages automatically after the `CI` workflow succeeds for `main`, and it can also be run manually with a `ref` input through `workflow_dispatch`.

Before the workflow can publish, enable GitHub Pages for the repository and set the build source to GitHub Actions in the repository settings.

The workflow reads the configured Pages base path from GitHub and passes it to Expo as `EXPO_BASE_URL`, so project sites such as `https://vehpus.github.io/choir-lms/` and custom domains export the correct asset URLs.

For Google Drive sign-in to work in the deployed web build, add repository variables for `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`. The workflow also reads optional repository variables for `EXPO_PUBLIC_APP_SCHEME`, `EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER`, `EXPO_PUBLIC_ANDROID_PACKAGE`, `EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_MIME_TYPES`, and `EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_EXTENSIONS`.

Do not add `GOOGLE_WEB_CLIENT_SECRET` to the repository or workflow for this frontend-only deployment.

To preview the same path handling locally for the current repository URL shape:

```sh
EXPO_BASE_URL=/choir-lms npm exec -- nx run mobile-rehearsal-player:build
```

OpenSpec workflow:

```sh
openspec list --json
openspec status --change "add-mobile-rehearsal-player"
```

### Agentic OpenSpec workflow:

- repo-level policy lives in `AGENTS.md`
- OpenSpec change artifacts auto-load additional guidance from `.github/instructions/openspec-deliberate-execution.instructions.md`
- `openspec-checkpointed-implementation` runs the one-subtask execution loop
- `implementation-checkpoint` handles the validated pause for feedback, manual verification, and commit decisions

### Workspace agent skills

The repo carries workspace-local GitHub Copilot skills under `.github/skills/`
with mirrored agent copies under `.agents/skills/` for repeated mobile design
and implementation work:

- `mobile-folder-structure` for Expo-inspired naming and folder-organization work in `packages/mobile-rehearsal-player`, especially when reducing flat directories or grouping files by feature ownership
- `expo-liquid-glass` for guarded glass or translucent UI work in the mobile shell, mini-player, playback sheet, and modal surfaces
- `design-audit` for phased UI and UX audits of the mobile rehearsal player before broader visual refactors
- `apple-hig-ios` and `music-ui-iconography` for iOS pattern decisions and playback icon semantics

## Status

The repository is still in early setup. The product direction and first implementation slice are defined in OpenSpec, and the next step is implementation of the mobile rehearsal player foundations.
