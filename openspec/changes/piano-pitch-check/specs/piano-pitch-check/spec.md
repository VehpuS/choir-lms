## ADDED Requirements

### Requirement: A piano overlay opens over the app without interrupting playback

The system SHALL provide a piano overlay: a non-modal keyboard docked at the bottom of the screen, directly above the mini-player and tab bar when they are shown. It SHALL open and close from a single control, SHALL NOT pause, duck, seek, or otherwise alter the playing track, and SHALL leave the playback transport, waveform, and score usable while open. The overlay SHALL work while the track is playing, while it is paused, and with no track at all (before anything has played, or after playback has ended).

#### Scenario: Open the piano during playback

- **WHEN** a track is playing and the user opens the piano
- **THEN** the keyboard appears docked above the mini-player, the track keeps playing from the same position, and the transport remains reachable

#### Scenario: Use the piano while paused

- **WHEN** playback is paused and the user presses a key
- **THEN** the note sounds and the track stays paused

#### Scenario: Close

- **WHEN** the user closes the piano
- **THEN** the keyboard hides and the open state is cleared everywhere; opening it again restores the same height and scroll position

#### Scenario: The overlay is remembered

- **WHEN** the user reopens the app after leaving the piano open at a chosen height and scroll position
- **THEN** the piano is open again at that height and scroll position

### Requirement: The keyboard is an 88-key scrollable strip with sensible starting range

The keyboard SHALL span A0 to C8, SHALL scroll horizontally, and SHALL open centred on middle C (C4) when it has no stored position. When sheet music is showing a part, the keyboard SHALL open centred on the middle of that part's note range, once per opening and never while the user is scrolling. Keys SHALL be at least 40 pt wide for white keys. C keys SHALL be labelled with their octave (`C4`); with `Show every note name` on, all natural keys and the black keys in the chosen spelling (sharps or flats) SHALL be labelled.

#### Scenario: First open

- **WHEN** the piano opens for the first time on a device
- **THEN** middle C is in view, about centred, and the keys to either side can be scrolled to

#### Scenario: Open from a score with a vocal part

- **WHEN** the piano opens while the sheet music viewer shows a part spanning A3 to E5
- **THEN** the keyboard centres on the middle of that range and the whole range is visible when it fits

#### Scenario: Octave labels

- **WHEN** the keyboard is visible with default settings
- **THEN** each C key shows its name with octave and no other key shows a name

### Requirement: Keys play while held, with several at once

A key SHALL start sounding when pressed and sound until released, with a short release tail. The keyboard SHALL support several simultaneous touches. A held touch that moves to another key SHALL release the first key and press the new one. A touch that begins on a key SHALL never scroll the strip, and a touch that begins on the scroll strip beneath the keys SHALL scroll it. No more than ten notes SHALL sound at once, releasing the oldest first. A pressed key SHALL show a pressed state for as long as it sounds.

#### Scenario: Hold a note to sing against it

- **WHEN** the user holds a key for four seconds
- **THEN** the note sounds for the full four seconds and fades shortly after release

#### Scenario: Two keys at once

- **WHEN** the user presses two keys with two fingers
- **THEN** both sound and both show the pressed state until each is released

#### Scenario: Slide across keys

- **WHEN** the user presses a key and slides the finger onto the next key
- **THEN** the first note is released and the second starts

#### Scenario: Scrolling does not play

- **WHEN** the user drags along the scroll strip beneath the keys
- **THEN** the keyboard scrolls and no note sounds

### Requirement: The overlay is resizable and keeps the score visible

The overlay SHALL offer three heights (compact, regular, tall) chosen by dragging its handle, which snaps to a step, and SHALL remember the choice. Inside the sheet music viewer the keyboard SHALL dock beneath the score, and the score area SHALL shrink to the space above it so the staves stay visible. In a viewer in its compact-height layout the piano SHALL be drawn no taller than the compact height, without changing the height remembered for other screens.

#### Scenario: Resize

- **WHEN** the user drags the handle up past the midpoint to the next step
- **THEN** the keyboard snaps to the taller step and the key height grows with it

#### Scenario: Opened inside the viewer

- **WHEN** the piano is open and the user opens the sheet music viewer
- **THEN** the viewer shows the keyboard docked under the score, the score fits the space above it, and closing the piano in the viewer also closes it everywhere

### Requirement: The piano mixes on top of the track at its own volume

The piano SHALL produce its sound separately from the track and SHALL NOT change the track's volume, position, or shaping. The overlay SHALL include a volume control for the piano alone, remembered on the device, defaulting to 70%. The keyboard SHALL always sound concert pitch (A4 = 440 Hz) and SHALL NOT follow the track's pitch shaping.

#### Scenario: Track untouched

- **WHEN** the user plays piano keys while a shaped track plays at +3 semitones
- **THEN** the keys sound their written concert pitch and the track's volume, speed, and pitch are unchanged

#### Scenario: Piano volume

- **WHEN** the user lowers the piano volume and presses a key
- **THEN** the key sounds quieter and the track's volume is unchanged, and the setting persists after a restart

### Requirement: The user chooses between a piano and an organ sound in Settings

The system SHALL provide two sounds: a `Piano` (the default; a synthesized piano tone until recorded samples are added) and a simple `Organ` tone. Settings SHALL include a `Piano` section with `Sound`, `Show every note name`, and `Black key names` (`Sharps` or `Flats`) rows. A change SHALL apply from the next key press. Where the `Piano` sound uses recorded samples, they SHALL load the first time a key is pressed, not at app start, and the first press SHALL sound as soon as the samples arrive, within 1.5 seconds, or fall back to the organ tone for that press if loading fails.

#### Scenario: Choose the organ

- **WHEN** the user selects `Organ` in Settings and presses a key
- **THEN** the key sounds the organ tone, and the choice is remembered after a restart

#### Scenario: Sample loading fails

- **WHEN** the piano uses recorded samples and they cannot be loaded and the user presses a key
- **THEN** the note still sounds in the organ tone and the overlay shows a quiet notice that the piano sound is unavailable

#### Scenario: Unknown stored value

- **WHEN** the stored sound preference is unrecognised
- **THEN** the piano sound is used

### Requirement: Tapping a note in sheet music plays it

For sheet music rendered from MusicXML or MIDI, tapping a notehead SHALL sound that note's pitch for as long as it is held, at least 350 ms, using the current piano sound and volume, whether or not the piano overlay is open. When the overlay is open, the matching key SHALL show the pressed state. The tapped notehead SHALL show a highlight while it sounds. Pitch SHALL be the sounding pitch (written pitch plus any part transposition). A tap on a rest, empty staff, or a tied continuation SHALL do nothing. PDF sheet music SHALL NOT make notes tappable.

#### Scenario: Tap a note

- **WHEN** the user taps a quarter-note G4 in a rendered MusicXML part with the piano open
- **THEN** G4 sounds, the G4 key shows the pressed state, and the notehead is highlighted until it is released

#### Scenario: Tap with the piano closed

- **WHEN** the user taps a notehead while the piano is closed
- **THEN** the note sounds and no keyboard appears

#### Scenario: MIDI source

- **WHEN** the score is a MIDI file shown as staves and the user taps a notehead
- **THEN** it sounds exactly as in MusicXML

#### Scenario: PDF

- **WHEN** the source is a PDF
- **THEN** tapping the page plays nothing

#### Scenario: A transposed part

- **WHEN** the user taps a written C5 in a part whose transposition lowers sounding pitch by a major second
- **THEN** B♭4 sounds

### Requirement: The piano is available only where it can make sound

The system SHALL show the piano control only when the platform can play it. On a platform without piano sound (native iOS and Android until the follow-up lands), or a browser without Web Audio, the controls SHALL be absent and notes in sheet music SHALL NOT be tappable.

#### Scenario: Native

- **WHEN** the app runs on iOS or Android
- **THEN** the playback screen, mini-player, and viewer toolbar show no piano control

#### Scenario: Web with Web Audio

- **WHEN** the app runs on web in a browser with Web Audio
- **THEN** the piano controls appear
