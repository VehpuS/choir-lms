## ADDED Requirements

### Requirement: A PDF can be shown in a scrolling, paged, or sideways-strip layout

The system SHALL let a user choose, in the web viewer, how an open PDF is laid out: `Scroll` (a vertical column of pages fitted to the width, today's behavior and the default), `Pages` (one page at a time fitted whole to the viewer, turned by swiping, the arrow keys, or `Previous page` and `Next page` controls, snapping to each page), or `Strip` (every page side by side in one row that scrolls sideways, each fitted to the viewer's height, with no snapping). Changing the layout SHALL keep the page the user was reading in view. Only pages near the viewport SHALL hold drawn content in every layout.

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
