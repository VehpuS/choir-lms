## ADDED Requirements

### Requirement: The web app fills the visible viewport in any orientation

The web shell SHALL fill the visible viewport in portrait and landscape, with no area outside the app painted in a colour other than the app background, and SHALL respect the safe-area insets on every edge. After the device rotates, the layout SHALL settle without the user scrolling.

#### Scenario: Rotate to landscape

- **WHEN** the app is open as a home-screen web app and the device is turned to landscape
- **THEN** the shell fills the viewport and no white gap shows at any edge

#### Scenario: Notch and home indicator

- **WHEN** the device has a notch or home indicator and is in landscape
- **THEN** controls are not covered by them and the app background still reaches the screen edge

### Requirement: A wide, short window uses a landscape layout

The system SHALL choose a layout class from the window size: `compact` below 600 points wide, and `wide-short` at 600 or more points wide and under 500 points high. A small change in window size near a threshold, such as the keyboard opening, SHALL NOT change the class. Every action available in `compact` SHALL remain available in `wide-short`.

#### Scenario: Phone on its side

- **WHEN** the window is 844 by 390
- **THEN** the wide-short layout is used

#### Scenario: Keyboard opens

- **WHEN** a soft keyboard reduces the height of a compact portrait window
- **THEN** the layout class does not change

### Requirement: Wide-short navigation uses a side rail

In the wide-short layout, Recents, Add and Library SHALL be reached from a rail on the leading edge, with the same destinations and active state as the bottom tabs.

#### Scenario: Switch destination

- **WHEN** a user taps Library in the rail
- **THEN** the Library shows beside the rail and the rail marks Library as active

### Requirement: Now Playing stays visible while browsing in wide-short

In the wide-short layout, the mini-player SHALL be a Now Playing pane beside the content with the title, transport, progress, loop and speed. When nothing is playing the pane SHALL be hidden and the content SHALL use the full width. Opening the full playback view SHALL show its controls and the Queue or Shaping surface side by side.

#### Scenario: Browse while playing

- **WHEN** a track is playing and the user moves between Library and Recents
- **THEN** the Now Playing pane stays visible and keeps playing

#### Scenario: Nothing playing

- **WHEN** no track is loaded
- **THEN** no Now Playing pane is shown

#### Scenario: Queue beside controls

- **WHEN** the user opens the full playback view and chooses Queue
- **THEN** the transport stays on the left and the queue shows on the right

### Requirement: Practice tools open beside the content in wide-short

In the wide-short layout, the piano, pitch monitor and recording controls SHALL open as a panel beside the content rather than as strips that reduce its height, and the sheet-music and lyrics viewers SHALL use the full window height.

#### Scenario: Pitch monitor in landscape

- **WHEN** the user starts the pitch monitor in the wide-short layout
- **THEN** it shows in a trailing panel and the content keeps its full height
