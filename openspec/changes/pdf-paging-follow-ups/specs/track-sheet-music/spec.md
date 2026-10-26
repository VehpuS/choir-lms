## MODIFIED Requirements

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

## ADDED Requirements

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
