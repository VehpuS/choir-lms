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

In the wide-short layout, Library, Add, Recents and the Practice tools menu SHALL be reached from a rail on the leading edge, with the same entries and active state as the bottom tabs. The Library's add button SHALL be a header action rather than a floating button over the list.

#### Scenario: Switch destination

- **WHEN** a user taps Library in the rail
- **THEN** the Library shows beside the rail and the rail marks Library as active

### Requirement: Now Playing stays visible while browsing in wide-short

In the wide-short layout, the mini-player SHALL be a Now Playing pane beside the content with the title, transport, progress, loop and speed. When nothing is playing the pane SHALL be hidden and the content SHALL use the full width. Opening the full playback view SHALL show its controls (waveform, transport, speed, pitch, loop, volume) and one surface (Lyrics, Queue, Shaping, or Mix for a composite) side by side, with no control below the fold.

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

In the wide-short layout, the piano, pitch monitor and recording controls SHALL open as a panel on the trailing side, in place of the Now Playing pane while open, rather than as strips that reduce the content's height, and the sheet-music and lyrics viewers SHALL use the full window height.

#### Scenario: Pitch monitor in landscape

- **WHEN** the user starts the pitch monitor in the wide-short layout
- **THEN** it shows in the trailing panel in place of the Now Playing pane, the content keeps its full height and playback continues

#### Scenario: Tool closed

- **WHEN** the user closes the tool while a track is playing
- **THEN** the Now Playing pane returns

### Requirement: Menus and sheets are not clipped in wide-short

In the wide-short layout, menus and sheets that are bottom sheets in the compact layout SHALL open as a trailing side sheet no wider than 380 points that uses the full height and scrolls inside, so every action is reachable.

#### Scenario: Track menu

- **WHEN** the user opens a track's overflow menu in the wide-short layout
- **THEN** every action is reachable by scrolling the side sheet

#### Scenario: Account menu over a practice tool

- **WHEN** a practice tool is open and the user opens the account menu
- **THEN** the menu is fully reachable and not covered by the tool

### Requirement: The piano does not cover the header in wide-short

In the wide-short layout, the piano SHALL dock at the bottom of the content area, right of the rail, at a compact height, and SHALL NOT cover the screen header or leave the content with no visible row when the pitch monitor is also open.

#### Scenario: Piano with the pitch monitor

- **WHEN** the piano and the pitch monitor are both open in the wide-short layout
- **THEN** the screen header stays visible and at least one content row is visible

### Requirement: The piano can go full screen in wide-short

In the wide-short layout, the piano SHALL offer a full screen option from its controls bar. Full screen SHALL hide the rail, the Now Playing pane and the content and show the keyboard at the full window height with a slim bar for volume, zoom, the sung-note readout, Exit full screen and Close. The choice SHALL be remembered on the device. Playback SHALL continue and a floating chip SHALL show the playing title and a pause control. The sung-note highlight and the out-of-view arrow SHALL work as in the compact keyboard.

#### Scenario: Enter and exit

- **WHEN** the user taps Full screen on the piano in the wide-short layout
- **THEN** the keyboard fills the window height and the rail and content are hidden
- **AND WHEN** the user taps Exit full screen
- **THEN** the compact keyboard and the rest of the shell return

#### Scenario: Remembered

- **WHEN** the piano was closed in full screen and the user opens it again
- **THEN** it opens in full screen

#### Scenario: Playback continues

- **WHEN** a track is playing and the piano is full screen
- **THEN** the track keeps playing and a chip with its title and a pause control is visible

#### Scenario: Back to compact

- **WHEN** the window leaves the wide-short layout while the piano is full screen
- **THEN** the piano shows as in the compact layout and the full screen choice is kept for the next time
