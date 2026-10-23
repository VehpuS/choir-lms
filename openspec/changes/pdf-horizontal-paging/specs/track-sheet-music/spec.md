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

### Requirement: The chosen PDF layout is remembered for the device

The system SHALL store one PDF layout choice for the device and use it for every PDF opened afterwards, and SHALL fall back to `Scroll` when nothing is stored or the stored value is not a known layout. The choice SHALL NOT be stored on a sheet music source or a track.

#### Scenario: Remembered across PDFs and sessions

- **WHEN** a user chooses `Pages` and later opens a different PDF, or reopens the app
- **THEN** that PDF opens in `Pages`

#### Scenario: Unreadable stored value

- **WHEN** the stored layout is missing or not one the app knows
- **THEN** the PDF opens in `Scroll`

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
