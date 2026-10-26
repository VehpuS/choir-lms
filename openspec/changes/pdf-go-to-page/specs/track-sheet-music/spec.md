## ADDED Requirements

### Requirement: The page indicator opens a Go to page sheet

The system SHALL make the page indicator of an open PDF in the web viewer a button, in every layout, that opens a `Go to page` sheet. The sheet SHALL contain a page-number field (counting from 1, prefilled with the current page) with a `Go` button, above a grid of page thumbnails. `Go` SHALL be enabled only when the field holds a whole number from 1 to the page count, and the sheet SHALL show that range. Choosing `Go` (or pressing Enter in the field) or choosing a thumbnail SHALL close the sheet and move the viewer to that page. In `Spread`, the page SHALL be shown in the spread that holds it, and both pages of the current spread SHALL be marked in the grid; otherwise the current page SHALL be marked.

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
