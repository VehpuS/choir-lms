## ADDED Requirements

### Requirement: Document metadata and installability

The web export SHALL declare its language, a title, a description, a `theme-color` and `color-scheme` matching the app background, and link a web app manifest with a stable `id`, a name, standalone display and icons. It SHALL NOT use framework-cased attributes (such as `httpEquiv`) in static HTML.

#### Scenario: Metadata is present in the export

- **WHEN** the built web export is loaded
- **THEN** the document has a description, a theme colour equal to the app background, and a manifest link that resolves under the configured base path

#### Scenario: Manifest is installable

- **WHEN** the manifest is fetched from the served export
- **THEN** it has an `id`, `name`, `start_url` within `scope`, `display` of standalone and icons that load

### Requirement: Overlays are accessible dialogs

Every web sheet and dialog SHALL expose a dialog role with an accessible name, move focus in on open, keep keyboard focus inside while open, return focus to the opener on close, and close from the topmost layer first on Escape. The dismiss backdrop SHALL have an accessible name.

#### Scenario: Focus is contained and restored

- **WHEN** a sheet opens from a button, Tab is pressed past its last control, and the sheet closes
- **THEN** focus stays inside the sheet while open and returns to the button on close

#### Scenario: Escape closes one layer

- **WHEN** a menu is open over a sheet and Escape is pressed once
- **THEN** only the menu closes

### Requirement: Motion and contrast preferences

Animation outside the playback surface SHALL be removed or reduced under `prefers-reduced-motion: reduce`. Under `forced-colors: active`, focus indicators and controls that rely on colour alone SHALL remain visible.

#### Scenario: Reduced motion

- **WHEN** the page is emulated with reduced motion and a sheet is opened
- **THEN** it appears without a slide or fade transition

#### Scenario: Forced colors

- **WHEN** the page is emulated with forced colors and a control is focused by keyboard
- **THEN** a visible focus indicator is present

### Requirement: Durable local storage

The web app SHALL request persistent storage before the first offline audio, waveform or prepared-stem write, and SHALL NOT treat a refusal as an error.

#### Scenario: Persistence is requested once

- **WHEN** the first file is saved for offline use
- **THEN** `navigator.storage.persist` is called once and the save succeeds whether it resolves true or false

### Requirement: Restrictive security policy

The web export SHALL carry a Content-Security-Policy that allows only the app's own origin and its declared Google and lyrics hosts, and external links SHALL open without giving the target a reference to the opener.

#### Scenario: Scenarios pass under the policy

- **WHEN** the browser suite runs against an export carrying the policy
- **THEN** no scenario reports a CSP violation or an undeclared host

### Requirement: Merge gate for web platform changes

A pull request implementing this change SHALL state in its description that maintainers must run the full browser matrix (`browser-test-matrix`) and the default `browser-test` lane, and SHALL NOT be merged until both pass.

#### Scenario: Matrix has not run

- **WHEN** the PR has no passing `browser-matrix` run on its latest commit
- **THEN** the PR is not merged
