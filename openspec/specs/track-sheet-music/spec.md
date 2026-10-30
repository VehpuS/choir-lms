# track-sheet-music Specification

## Purpose

Sheet music links on a track: Drive files and web links, the viewer (PDF, MusicXML, MIDI), parts, search, and the manager. Created by archiving change lyrics-lookup-and-saving.

## Requirements

### Requirement: A saved track can carry sheet music sources as links

The system SHALL let a user attach zero or more sheet music sources to a saved track, up to 10, each with a label and a location that is either a Google Drive file or a web URL, stored with the track in the library and persisted across app restarts. The system SHALL store only the link, the label, the detected format, and the part selection; it SHALL NOT copy, host, or upload the score. Sheet music SHALL be optional and SHALL NOT appear as a section, preview, or empty-state prompt on the playback screen.

#### Scenario: Attach a Drive file

- **WHEN** a user chooses `Sheet music`, then `Add sheet music`, then `From Google Drive`, and picks a supported file
- **THEN** a source with that file's name as its label is added to the track and is present after the app restarts

#### Scenario: Attach a web link

- **WHEN** a user pastes `https://example.org/scores/kyrie-alto.pdf` and confirms
- **THEN** a source with a label the user can edit is added, with its format detected as PDF

#### Scenario: Several sources on one track

- **WHEN** a user attaches `Full score` and `Alto part` to the same track
- **THEN** both are listed in the order added, each with its own part selection

#### Scenario: The limit

- **WHEN** a track already has 10 sources
- **THEN** `Add sheet music` is unavailable and the sheet explains the limit

#### Scenario: Unsupported file or link

- **WHEN** a user picks or pastes a file whose format is not one of PDF, MusicXML, MIDI, or a MuseScore file or page
- **THEN** it is refused with a message that names the supported formats, and nothing is added

#### Scenario: Remove and rename

- **WHEN** a user renames or removes a source from the manager sheet
- **THEN** the track's list updates, and removing the last source leaves the track with no sheet music field

### Requirement: Sheet music can be searched on MuseScore without leaving a record of it

The system SHALL offer `Search MuseScore` in the add flow, which opens the system browser on a MuseScore search for the Title and Artist shown in the add flow, and SHALL accept the result back as a pasted `musescore.com` link or as a file the user saved to Drive or hosted at a URL. The system SHALL NOT fetch, scrape, or download from MuseScore on the user's behalf and SHALL NOT require a MuseScore account.

#### Scenario: Search from the add flow

- **WHEN** a user taps `Search MuseScore` with Title `Kyrie` and Artist `Mozart`
- **THEN** the system browser opens a MuseScore search for `Kyrie Mozart`, and the app state is unchanged

#### Scenario: A MuseScore page link

- **WHEN** a user pastes a `musescore.com` score page link
- **THEN** a source is added that opens in the system browser and says `Opens outside the app`

#### Scenario: A MuseScore file

- **WHEN** a user adds a `.mscz` or `.mscx` file from Drive
- **THEN** it is added as a source that opens outside the app, with a hint to export MusicXML from MuseScore for display in the app

### Requirement: Sheet music opens only in full screen and is rendered as music

The system SHALL open a sheet music source only in a full-screen viewer, reached from the `Sheet music` manager sheet, and SHALL show: PDF sources as rendered pages; MusicXML (`.musicxml`, `.xml`, `.mxl`) sources as rendered staves; and MIDI sources as staves notated from the file. The viewer SHALL provide a close control, a switcher between the track's sources, zoom, and a play/pause control so playback stays reachable, and SHALL keep the screen awake while open.

#### Scenario: Open a PDF

- **WHEN** a user taps `View` on a PDF source
- **THEN** the full-screen viewer shows the PDF's pages and closing it returns to the previous screen with playback unchanged

#### Scenario: Open MusicXML

- **WHEN** a user opens a MusicXML source
- **THEN** its staves are rendered as notation, not as a picture of a file or as text

#### Scenario: A phone held sideways

- **WHEN** the viewer is open on a short screen, such as a phone in landscape
- **THEN** the close, zoom, and play/pause controls sit beside the score and the source and part chips share one row, so the score keeps most of the screen's height, and turning the phone while the viewer is open keeps the file, zoom, and chosen parts

#### Scenario: Staves scroll sideways

- **WHEN** a user opens a MusicXML or MIDI source
- **THEN** its staves are one continuous line that scrolls horizontally, not lines wrapped to the screen width

#### Scenario: Open MIDI

- **WHEN** a user opens a MIDI source
- **THEN** staves notated from the MIDI are shown, through the same renderer and part filter as MusicXML, with no label marking them as converted

#### Scenario: Switch between sources

- **WHEN** a track has `Full score` and `Alto part` and the user switches source in the viewer
- **THEN** the other source loads in place, with its own saved part selection

#### Scenario: No preview on the playback screen

- **WHEN** a track with sheet music plays
- **THEN** the playback screen and the mini-player show no sheet music section, preview, or control

### Requirement: MusicXML and MIDI parts can be filtered, showing vocal parts by default

For MusicXML and MIDI sources the viewer SHALL list the file's parts and SHALL show only the vocal parts by default, with `All parts` and per-part toggles to change what is shown. When no vocal part is recognized the viewer SHALL show all parts and say that no vocal parts were recognized. The choice SHALL be saved on the source and applied the next time it opens; if a saved part no longer exists in the file, the selection SHALL fall back to the vocal parts. PDF sources SHALL NOT offer part filtering.

#### Scenario: Vocal parts by default

- **WHEN** a user opens a MusicXML source with parts Soprano, Alto, Tenor, Bass, and Piano
- **THEN** Soprano, Alto, Tenor, and Bass are shown and Piano is hidden, with Piano available to switch on

#### Scenario: Choose one part

- **WHEN** a user switches off every part except Alto
- **THEN** only the Alto staff is shown, and reopening the source shows only Alto

#### Scenario: No vocal part recognized

- **WHEN** a source's parts are named `Track 1` and `Track 2`
- **THEN** both are shown and the viewer says that no vocal parts were recognized

#### Scenario: A saved part is gone

- **WHEN** the file at a source changes so a saved part no longer exists
- **THEN** the viewer falls back to the vocal parts

#### Scenario: PDFs

- **WHEN** a PDF source is open
- **THEN** no part controls are shown

### Requirement: Loading a source is on demand and fails clearly

The system SHALL fetch a sheet music source only when the viewer opens it, SHALL cancel the request when the viewer closes, and SHALL show a specific message with a next step for each failure: Drive access needed, file not found, a web host that blocks browser requests, a web host that cannot be reached, a file over the size limit, a file that is not the kind of sheet music the source claims (saying whether it is a web page, not MusicXML, or in an encoding that cannot be read), no connection, or the file source unavailable. A failure SHALL NOT change the stored sources.

#### Scenario: Drive access expired

- **WHEN** a Drive source is opened while Drive authorization has expired
- **THEN** the viewer says Drive access is needed and offers to reconnect

#### Scenario: Host blocks browser requests

- **WHEN** a web source's host does not allow the request from the web build
- **THEN** the viewer says the site does not let the app read the file
- **AND** offers `Save to Drive` and `Open in browser`

#### Scenario: Host cannot be reached

- **WHEN** a web source's host does not answer at all
- **THEN** the viewer says the site could not be reached, and does not offer `Save to Drive`

#### Scenario: The link returns a web page

- **WHEN** a source that should be a score returns a web page instead
- **THEN** the viewer says the link opens a web page, not a score file

#### Scenario: Too large

- **WHEN** a file is over 25 MB
- **THEN** it is not loaded, and the viewer says so and offers `Open in browser` for a URL source

#### Scenario: Nothing fetched until opened

- **WHEN** a user adds a web source
- **THEN** no request for the file is made until the viewer opens it

### Requirement: Loops and adjusted tracks share their parent track's sheet music

The system SHALL resolve the sheet music of a loop, an adjusted track, or a loop of an adjusted track to the saved track that owns it, SHALL NOT store a copy on a derived item, and SHALL name the owning track in the manager sheet. Removing a track SHALL remove its sheet music links, and a derived item whose owning track no longer exists SHALL show no sheet music.

#### Scenario: A loop opens its track's sheet music

- **WHEN** a user chooses `Sheet music` on a loop whose track has sources
- **THEN** the manager sheet lists the track's sources and its subtitle names that track

#### Scenario: Removing a track removes its links

- **WHEN** a user removes a track from the library
- **THEN** its sheet music links are removed with it

### Requirement: MusicXML opens whatever text encoding it was saved in

The system SHALL open uncompressed MusicXML saved as UTF-8 (with or without a byte-order mark) or UTF-16 (either byte order), and compressed `.mxl` files, and SHALL render the same score from each.

#### Scenario: UTF-16 MusicXML

- **WHEN** a MusicXML source saved as UTF-16 is opened
- **THEN** the score is drawn with its lyrics, as the UTF-8 file would be

#### Scenario: UTF-8 with a byte-order mark

- **WHEN** a MusicXML source starts with a UTF-8 byte-order mark
- **THEN** the score is drawn

#### Scenario: An unreadable encoding

- **WHEN** a source claims to be MusicXML but its text cannot be decoded
- **THEN** the viewer says the file's encoding cannot be read, not that it is not MusicXML

### Requirement: A PDF can be zoomed by gesture as well as by the zoom controls

The system SHALL let a user zoom a PDF in the web viewer by pinching, by holding `Ctrl` or `Cmd` while scrolling the wheel, and by double-tapping or double-clicking to toggle between fitting the page width and a readable zoom, in addition to the zoom controls. Zoom SHALL stay within the same minimum and maximum as the controls, SHALL keep the point under the pointer in place, and SHALL zoom the PDF rather than the browser page.

#### Scenario: Pinch to zoom

- **WHEN** a user pinches on an open PDF
- **THEN** the pages zoom around the pinch point and the zoom value in the toolbar follows

#### Scenario: Wheel zoom on desktop

- **WHEN** a user scrolls the wheel with `Ctrl` or `Cmd` held over an open PDF
- **THEN** the PDF zooms and the browser page does not

#### Scenario: Double-tap toggles

- **WHEN** a user double-taps a PDF that is fitted to the width
- **THEN** it zooms to a readable size at the tapped point
- **AND** a second double-tap returns to fitting the width

#### Scenario: Limits

- **WHEN** a gesture would zoom beyond the zoom controls' minimum or maximum
- **THEN** the zoom stops at that limit

### Requirement: A PDF can be shown in a scrolling, paged, or sideways-strip layout

The system SHALL let a user choose, in the web viewer, how an open PDF is laid out: `Scroll` (a vertical column of pages fitted to the width, today's behavior and the default), `Pages` (one page at a time fitted whole to the viewer, turned by swiping, the arrow keys, or `Previous page` and `Next page` controls, snapping to each page), `Strip` (every page side by side in one row that scrolls sideways, each fitted to the viewer's height, with no snapping), or `Spread` (two pages side by side fitted whole to the viewer, turned by spread, snapping to each spread, with page 1 paired with page 2, page 3 with page 4, and so on). `Spread` SHALL be offered only while the viewer is wide enough to show two readable pages and SHALL never be chosen automatically. Changing the layout SHALL keep the page the user was reading in view. Only pages near the viewport SHALL hold drawn content in every layout.

#### Scenario: Default layout

- **WHEN** a user opens a PDF and has never chosen a layout
- **THEN** the pages show as a vertical column fitted to the width

#### Scenario: Pages layout

- **WHEN** a user chooses `Pages`
- **THEN** one whole page is shown at a time
- **AND** swiping sideways, pressing the left or right arrow key, or `Next page` moves to the next page and the view snaps to it

#### Scenario: Strip layout

- **WHEN** a user chooses `Strip`
- **THEN** the pages sit side by side and scroll sideways without snapping
- **AND** each page is as tall as the viewer allows

#### Scenario: Spread layout

- **WHEN** a user chooses `Spread` in a wide viewer
- **THEN** pages 1 and 2 show together, and turning moves to pages 3 and 4, then 5 and 6
- **AND** the view snaps to each spread

#### Scenario: Spread is offered only when wide

- **WHEN** the viewer is too narrow to show two readable pages
- **THEN** the layout choices do not include `Spread`

#### Scenario: Spread no longer fits

- **WHEN** a PDF is open in `Spread` and the viewer becomes too narrow (for example the window is resized)
- **THEN** the viewer shows `Pages` on the page the user was reading, without changing the stored layout
- **AND** `Spread` returns when the viewer is wide enough again

#### Scenario: A stored Spread on a narrow viewer

- **WHEN** the device or a file has `Spread` stored and the PDF opens in a viewer that is too narrow
- **THEN** it opens in `Pages`

#### Scenario: Changing layout keeps the page

- **WHEN** a user is on page 12 and changes the layout
- **THEN** page 12 is in view after the change

#### Scenario: A long document stays light

- **WHEN** a PDF of many pages is open in any layout
- **THEN** only the pages near the viewport hold drawn content, and pages that move far away release it

### Requirement: The PDF layout is remembered for the device and can be overridden for a file

The system SHALL store one PDF layout choice for the device and use it for every PDF that has no layout of its own, and SHALL let the user give one sheet music source its own layout that takes precedence over the device choice. A PDF SHALL open in its own layout when it has one, else the device layout, else `Scroll`; a stored value that is not a known layout SHALL be ignored. The user SHALL be able to remove a file's own layout so the file follows the device choice again. A file's own layout SHALL be saved on the sheet music source (as its part selection is), not on the track, and SHALL NOT change the device choice or any other source.

#### Scenario: Remembered across PDFs and sessions

- **WHEN** a user chooses `Pages` for the device and later opens a different PDF, or reopens the app
- **THEN** that PDF opens in `Pages`

#### Scenario: A file with its own layout

- **WHEN** a user sets `Strip` for one PDF only, and the device choice is `Pages`
- **THEN** that PDF opens in `Strip` every time, and other PDFs open in `Pages`

#### Scenario: Following the device again

- **WHEN** a user removes a file's own layout
- **THEN** the file opens in the device layout from then on

#### Scenario: Changing the device choice does not touch a file's own layout

- **WHEN** a file has its own layout and the user changes the device choice from another file
- **THEN** the first file still opens in its own layout

#### Scenario: Unreadable stored value

- **WHEN** a stored layout, on the device or on a source, is missing or not one the app knows
- **THEN** it is ignored and the next choice applies (the device layout, then `Scroll`)

### Requirement: The viewer shows which page a PDF is on and moves between pages

The system SHALL show the current page and the page count (for example `Page 3 of 81`) for an open PDF in every layout, SHALL keep it in step with scrolling and swiping, and SHALL let the user move to the previous or next page with the keyboard (left and right arrows, and `Page Up` and `Page Down`) and, in `Pages`, with `Previous page` and `Next page` controls that are disabled at the first and last page.

#### Scenario: Indicator follows reading

- **WHEN** a user scrolls or swipes to another page
- **THEN** the page indicator shows that page

#### Scenario: Ends of the document

- **WHEN** the first or last page is showing in `Pages`
- **THEN** `Previous page` or `Next page` is disabled

#### Scenario: Keyboard

- **WHEN** a user presses the right arrow key with a PDF open in `Pages` or `Strip`
- **THEN** the next page comes into view

### Requirement: Zoom works in every PDF layout

The system SHALL keep the zoom controls and gestures working in `Pages` and `Strip` with the same minimum and maximum as `Scroll`. In `Scroll` a zoom of 100% fits the page width; in `Pages` and `Strip` it fits the page to the viewer. In `Pages` a page SHALL snap only while it is fitted; when zoomed in, the page SHALL pan freely, and returning to the fitted zoom SHALL snap to the page again.

#### Scenario: Zooming in on a paged page

- **WHEN** a user zooms into a page in `Pages`
- **THEN** the page pans freely in both directions with no snapping to other pages

#### Scenario: Fitting again

- **WHEN** a user returns to the fitted zoom in `Pages`
- **THEN** the view snaps to the page it is on

#### Scenario: Gestures in the strip

- **WHEN** a user pinches or double-taps in `Strip`
- **THEN** the zoom changes around the gesture point as it does in `Scroll`

### Requirement: The page indicator opens a Go to page sheet

The system SHALL make the page indicator of an open PDF in the web viewer a button, in every layout, that opens a `Go to page` sheet. The sheet SHALL contain a page-number field (counting from 1, prefilled with the current page) with a `Go` button, above a grid of page thumbnails. `Go` SHALL be enabled only when the field holds a whole number from 1 to the page count, and the sheet SHALL show that range. Choosing `Go` (or pressing Enter in the field) or choosing a thumbnail SHALL close the sheet and move the viewer to that page. In `Spread`, the page SHALL be shown in the spread that holds it, and both pages of the current spread SHALL be marked in the grid; in a `Strip` wide enough to show several pages side by side, every page that is at least half in view SHALL be marked and the indicator SHALL read them as a range (for example `Pages 40-41 of 81`); otherwise the current page SHALL be marked. The indicator's touch area SHALL be at least 44 points tall and wide, and a text field in the sheet SHALL use text of at least 16 points so that iOS Safari does not zoom the page when it takes focus.

#### Scenario: Opening the sheet

- **WHEN** a user taps the page indicator of an 81-page PDF showing page 12
- **THEN** the `Go to page` sheet opens with `12` in the field, the range `1-81` shown, and page 12 marked in the grid

#### Scenario: Going by number

- **WHEN** a user enters `40` and chooses `Go`
- **THEN** the sheet closes and page 40 is shown

#### Scenario: Out-of-range number

- **WHEN** the field holds `0`, `82`, `4.5`, or nothing
- **THEN** `Go` is disabled and the page does not change

#### Scenario: Going by thumbnail

- **WHEN** a user chooses the thumbnail of page 7
- **THEN** the sheet closes and page 7 is shown

#### Scenario: Wide Strip

- **WHEN** a user in a `Strip` that shows about two pages at once chooses page 40
- **THEN** page 40 is at the start edge, the indicator reads `Pages 40-41 of 81`, and the sheet marks both pages when reopened

#### Scenario: Keyboard on a phone

- **WHEN** a user taps the page-number field on a phone and the soft keyboard opens
- **THEN** the field keeps focus, the viewer keeps its layout, and the field, `Go`, and the range stay in view above the keyboard

#### Scenario: Go to page in Spread

- **WHEN** a user in `Spread` chooses page 7
- **THEN** pages 7 and 8 are shown together
- **AND** the sheet marked both pages of the spread that was showing when it opened

### Requirement: Page thumbnails are drawn lazily and released

The system SHALL draw thumbnails only for the grid rows in view and a margin around them, one at a time, SHALL stop drawing rows that scroll out of range, and SHALL release every thumbnail when the sheet closes. Drawing thumbnails SHALL NOT keep the viewer's own pages from being drawn.

#### Scenario: Long score

- **WHEN** a user opens the sheet on an 81-page PDF
- **THEN** only the rows near the viewport hold drawn thumbnails, not all 81 pages

#### Scenario: Scrolling the grid

- **WHEN** a user scrolls the grid quickly
- **THEN** rows that scrolled away stop drawing and the rows now in view are drawn

#### Scenario: Closing the sheet

- **WHEN** the sheet closes
- **THEN** no thumbnail stays drawn

### Requirement: Changing the PDF layout returns the zoom to the new layout's fit

The system SHALL set the zoom to 100% of the new layout's fit whenever the user changes a PDF's layout, while keeping the page the user was reading in view. A layout change that the viewer makes by itself because of the viewer's width (such as `Spread` falling back to `Pages`) SHALL also return to the fit.

#### Scenario: Zoomed in Scroll, then Pages

- **WHEN** a user at 150% in `Scroll` chooses `Pages`
- **THEN** the page is shown fitted whole at 100% and snapping works at once

#### Scenario: The page is kept

- **WHEN** a user on page 12 at 200% changes the layout
- **THEN** page 12 is in view at the new layout's fit

### Requirement: Page keys keep working after the viewer's own controls are used

The system SHALL return keyboard focus to the PDF page area when a PDF viewer sheet (such as the layout sheet) closes and after a viewer toolbar button is used, so that the arrow keys, `Page Up`, and `Page Down` still turn pages without the user clicking the page first. Focus SHALL NOT be taken from a text field the user is typing in.

#### Scenario: After the layout sheet

- **WHEN** a user closes the layout sheet and presses the right arrow key
- **THEN** the next page comes into view

#### Scenario: After a toolbar button

- **WHEN** a user uses a toolbar button such as a zoom step and then presses `Page Down`
- **THEN** the page turns

#### Scenario: A text field keeps its focus

- **WHEN** a user is typing in a text field and presses an arrow key
- **THEN** the key edits the text and the page does not turn

### Requirement: Page turns from controls and keys animate briefly

The system SHALL animate a page turn made with `Previous page`, `Next page`, the arrow keys, `Page Up`, or `Page Down` as a short smooth scroll of about 200 milliseconds, and SHALL make it instant when the device asks for reduced motion. Swiping and the wheel are unchanged, and a turn requested while another is in progress SHALL end at the newest target.

#### Scenario: Animated turn

- **WHEN** a user presses `Next page` on a device without a reduced-motion setting
- **THEN** the view slides to the next page in about 200 milliseconds and the page indicator shows that page

#### Scenario: Reduced motion

- **WHEN** the device asks for reduced motion and the user presses `Next page`
- **THEN** the next page appears at once with no sliding

#### Scenario: Quick repeated turns

- **WHEN** a user presses the right arrow key three times in quick succession
- **THEN** the view ends three pages further on

### Requirement: The paged layouts show page controls beside the page indicator

The system SHALL place `Previous page` and `Next page` next to the page indicator in `Pages` and `Spread`, and keep the viewer toolbar to the controls that apply to every layout, so that the toolbar of a phone-width viewer in `Pages` fits one row and the page area keeps its height.

#### Scenario: Phone-width toolbar in Pages

- **WHEN** a PDF is open in `Pages` in a phone-width viewer in portrait
- **THEN** the toolbar controls fit one row
- **AND** `Previous page` and `Next page` sit beside the page indicator

#### Scenario: Phone held sideways

- **WHEN** a PDF is open in `Pages` or `Spread` on a phone held sideways, where the controls sit in a side rail
- **THEN** `Previous page` and `Next page` sit in the rail around a short page label such as `3/81`, and pressing the label opens `Go to page`
- **AND** the rail scrolls when its controls do not fit the screen's height, so none is out of reach

#### Scenario: Ends of the document

- **WHEN** the first or last page (or spread) is showing
- **THEN** `Previous page` or `Next page` is disabled

### Requirement: Pages hides its sideways scrollbar and Strip keeps it

The system SHALL hide the horizontal scrollbar under `Pages` and `Spread`, where swiping and the page controls move the view and the page indicator shows the position, and SHALL keep it under `Strip`, where the user scrolls freely.

#### Scenario: Pages without a scrollbar

- **WHEN** a PDF is open in `Pages`
- **THEN** no horizontal scrollbar is shown, and swiping and the page controls still move between pages

#### Scenario: Strip with a scrollbar

- **WHEN** a PDF is open in `Strip`
- **THEN** the horizontal scrollbar is shown and can be dragged

### Requirement: The score marks notes that match the sung pitch

While pitch detection is listening and a MusicXML or MIDI score is showing, the viewer SHALL mark the notes in view whose sounding pitch matches the sung note, following the matching rules of `pitch-detection` and honouring part transposition and the active pitch offset of the playing item (a sung note is compared with the written pitch plus that offset). While the offset is not zero the viewer SHALL show it, for example `Following track pitch −2 st`. Exact matches SHALL carry a strong mark. When `Show other-octave matches` (a row of the `Practice tools` menu while this viewer is open) is on, same-note-other-octave matches SHALL carry a visibly softer mark that cannot be mistaken for the strong one; when it is off, they SHALL carry none. It SHALL mark only notes currently in view, SHALL clear marks when the sung note ends or changes, and SHALL NOT scroll, turn pages, change the selected part, or alter playback. PDF scores SHALL show no marks.

#### Scenario: Sing a note on the page

- **WHEN** a score with several A4 notes in view is showing and the user sings A4
- **THEN** every A4 note in view is marked, and no note outside the view is touched

#### Scenario: The note changes

- **WHEN** the user moves from A4 to B4
- **THEN** the A4 marks clear and the B4 notes in view are marked

#### Scenario: Soft marks for another octave

- **WHEN** `Show other-octave matches` is on, A4 and A3 notes are in view, and the user sings A4
- **THEN** the A4 notes carry the strong mark and the A3 notes carry the soft mark

#### Scenario: Soft marks are off by default

- **WHEN** the setting has never been changed and the user sings A4 with A3 notes in view
- **THEN** only A4 notes are marked

#### Scenario: The track is pitch-shifted

- **WHEN** the playing track is shifted down 2 semitones, the score has A4 notes in view, and the user sings G4
- **THEN** the A4 notes are marked and the viewer shows `Following track pitch −2 st`

#### Scenario: The track is slowed down

- **WHEN** the playing track runs at 0.75× with no pitch shift and the user sings A4
- **THEN** the A4 notes are marked exactly as at normal speed and no offset is shown

#### Scenario: Transposing part

- **WHEN** the shown part is a transposing part and the user sings the sounding pitch of a written note
- **THEN** that written note is marked

#### Scenario: PDF

- **WHEN** a PDF score is showing and the user sings
- **THEN** no marks appear and the score is unaffected
