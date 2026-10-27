## RENAMED Requirements

- FROM: `### Requirement: The piano is reachable from the tab bar, playback, and the sheet music viewer`
- TO: `### Requirement: Practice tools are reachable from the tab bar, playback, and the sheet music viewer`

## MODIFIED Requirements

### Requirement: Practice tools are reachable from the tab bar, playback, and the sheet music viewer

The tab bar SHALL include a `Practice tools` item after the destinations, in the place of the former `Piano` item, so the tools can be reached on every screen with or without a track. Pressing it SHALL open a floating menu anchored to the control, listing one toggle row per available tool: `Piano` and `Pitch detection`; while the sheet music viewer is open it SHALL also list `Show other-octave matches`, a setting for the score marks that appears nowhere else. Each row SHALL show its tool's on or off state, pressing a row SHALL toggle that tool without closing the menu, and the menu SHALL close on a press outside it or on Escape. The item is a toggle host, not a destination: it SHALL show the accent colour, mark, and a filled glyph while any tool is on. The mini-player SHALL NOT carry its own tool controls. The dedicated playback screen SHALL include a `Practice tools` control in its header, beside the more actions button, and the sheet music viewer toolbar (and its rail in the compact layout) SHALL include the same control; each opens the same menu. Every control and row SHALL be at least 44 pt, use icons from the shared icon map, and carry accessible labels (`Practice tools`, and a row label with its state such as `Piano, on`). A row SHALL be absent where its tool is unavailable on the platform, and the whole control SHALL be absent where no tool is available. Opening a tool SHALL NOT move the waveform, transport, or mini-player; the overlay docks above them and the content area above shrinks. The menu SHALL be built so further tools can be added as rows.

#### Scenario: Open a tool with no track

- **WHEN** nothing has been played, or playback has ended and the mini-player is gone, and the user opens `Practice tools` and turns on `Piano`
- **THEN** the keyboard docks above the tab bar and plays, and stays open and playable when a track later starts or ends

#### Scenario: Open from the tab bar

- **WHEN** the user presses `Practice tools` in the tab bar on any screen and turns on `Piano`
- **THEN** a floating menu appears anchored to the control, the piano overlay docks above the tab bar (and above the mini-player when it shows), and the screen content above it shrinks to fit

#### Scenario: Two tools at once

- **WHEN** the user turns on `Piano`, then `Pitch detection`, without closing the menu
- **THEN** both rows show on, both tools are open, and the control shows its active state

#### Scenario: Dismiss the menu

- **WHEN** the menu is open and the user presses outside it, or presses Escape
- **THEN** the menu closes and the tools keep their state

#### Scenario: Open from the playback screen

- **WHEN** the user presses `Practice tools` on the playback screen and turns on `Piano`
- **THEN** the piano opens, the waveform and transport keep their positions in view, and the control shows its active state

#### Scenario: Open from the viewer

- **WHEN** the user presses `Practice tools` in the sheet music viewer and turns on `Piano`
- **THEN** the keyboard docks under the score and the score area shrinks to the space above it

#### Scenario: Other-octave matches row

- **WHEN** the user opens `Practice tools` from the sheet music viewer
- **THEN** the menu lists `Show other-octave matches` with its state, and the same menu opened from the tab bar or the playback screen does not

#### Scenario: Only one tool available

- **WHEN** a browser has Web Audio but no microphone support
- **THEN** the menu lists `Piano` only

#### Scenario: No tool available

- **WHEN** the app runs on native iOS or Android before either tool is built there
- **THEN** no `Practice tools` control appears on the tab bar, the playback screen, or the viewer
