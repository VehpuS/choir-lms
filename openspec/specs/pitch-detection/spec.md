# pitch-detection Specification

## Purpose

Let a singer see the note they are singing, and how close it is, by listening through the microphone: capture and permission, the detection pipeline with a minimum volume cutoff, the monitor strip and full Pitch view, matching against the piano and the score, privacy (nothing is recorded or sent), and visible failure states. Web first; native is tracked in `native-playback-follow-ups`.

## Requirements

### Requirement: Pitch detection is offered only where the platform can listen

The system SHALL offer the Pitch view, the monitor, and the detected states on the piano and score only on platforms where microphone capture is supported (web at this stage). Where it is not supported (native iOS and Android until they are built), those controls and states SHALL be absent rather than shown disabled, and nothing SHALL request the microphone.

#### Scenario: Web

- **WHEN** the app runs in a browser that grants microphone access
- **THEN** the Pitch view and monitor controls are available

#### Scenario: Native, not yet supported

- **WHEN** the app runs on iOS or Android before native capture exists
- **THEN** no pitch controls appear and the microphone is never requested

### Requirement: Pitch detection listens only when asked and explains the microphone first

The system SHALL listen to the microphone only after the user turns listening on, SHALL request microphone permission the first time they do so (never at launch), and SHALL show a short explanation that audio is processed on the device and never stored or sent before the system prompt appears. If permission is denied, the system SHALL show a persistent message with a way to open settings and SHALL NOT repeat the system prompt on its own.

#### Scenario: First use

- **WHEN** the user presses `Listen` for the first time
- **THEN** a short explanation appears, then the system permission prompt, and listening starts only if permission is granted

#### Scenario: Denied

- **WHEN** the user denies permission
- **THEN** the monitor and the Pitch view show that the microphone is blocked and explains how to allow it again (for the browser: allow the microphone for this site in the address bar or the browser's site settings, then press `Listen`), without a link the page cannot honour, and no prompt is shown again until the user presses `Listen`

#### Scenario: Blocked permanently

- **WHEN** the browser reports the permission as blocked and will not show the prompt again
- **THEN** pressing `Listen` shows the same instructions instead of failing silently

#### Scenario: Nothing is stored

- **WHEN** the user listens for any length of time
- **THEN** no audio samples are written to storage or sent over the network

### Requirement: The detected note is shown with name, octave, and cents

While listening, the system SHALL report the sung note as a name with octave (for example `A3`), the offset in cents from that note (rounded, with a sign), and a confidence. It SHALL show nothing for silence, noise, or unclear sound, and SHALL hold the last note briefly so the display does not flicker between syllables. Notes SHALL be measured against A4 = 440 Hz, which is fixed: there is no tuning setting.

#### Scenario: A steady note

- **WHEN** the user sings A3 about 10 cents flat for one second
- **THEN** the display shows `A3` with `-10` cents and a stable indicator

#### Scenario: Silence

- **WHEN** nothing is sung
- **THEN** the display shows its idle state and no note

#### Scenario: A short gap

- **WHEN** the user takes a breath between two syllables on the same note
- **THEN** the note stays on screen through the gap and does not flicker

### Requirement: A full Pitch view shows the pitch progression and how close the singing is to a note

The system SHALL provide a full-screen `Pitch` view, opened from the monitor's expand control and closed back to the monitor, that works with no track loaded and while a track plays or is paused. It SHALL show:

- **The pitch progression:** sung notes as bars on a note-labelled vertical scale that scrolls in time, with the current note at the leading edge. Each bar SHALL be coloured by its accuracy zone, and the time window SHALL be adjustable by zoom (about 5 to 60 seconds).
- **A focus panel:** how close the singing is to one target note, drawn as cents over time against labelled bands. The zones SHALL be `Precise` (within 10 cents), `Near` (within 25 cents), and `Quarter tone off` (up to 50 cents), and the current zone SHALL also be stated in text, not only by colour. The target SHALL default to the nearest note; the user MAY hold a chosen note, in which case the distance SHALL be measured from it, including beyond 50 cents (clamped, with a marker for the direction).
- **A readout bar:** the current pitch, the confidence, a control to stop and start listening, and the state.

The minimum volume SHALL be adjustable from the view, beside a live level meter. In landscape the progression SHALL take the width and the focus panel SHALL sit beside it. Opening, using, and closing the view SHALL NOT pause, seek, or otherwise alter playback. The view and its history SHALL NOT persist anything: the history lives in memory only and is dropped when listening stops.

#### Scenario: Watch the progression

- **WHEN** the user sings A3, then B3, then C4 for a second each
- **THEN** three bars appear in order on the labelled scale, scrolling left, each coloured by how close it was

#### Scenario: Precise or a quarter tone off

- **WHEN** the user sings A3 about 8 cents sharp and then about 40 cents sharp
- **THEN** the focus panel shows `Precise` for the first and `Quarter tone off` for the second, in text and in the band the trace sits in

#### Scenario: Hold a target

- **WHEN** the user holds A3 as the target and sings B3
- **THEN** the focus panel shows the distance from A3 (about 200 cents), clamped to the edge with a marker pointing up

#### Scenario: Landscape

- **WHEN** the device is held sideways
- **THEN** the progression fills the width and the focus panel sits beside it

#### Scenario: Use with no track

- **WHEN** the user opens the view before playing anything
- **THEN** it listens and shows notes normally

#### Scenario: Playback is untouched

- **WHEN** a track is playing and the user opens and closes the view
- **THEN** the track keeps playing from the same position

### Requirement: A minimal monitor stays open during playback

The system SHALL offer a minimal monitor showing the current note, a cents tick, and a few seconds of history. It SHALL stay open while the user navigates and while the piano and sheet music are closed, SHALL NOT cover the playback transport, and SHALL open the full `Pitch` view from its expand control. Turning on `Pitch detection` from any `Practice tools` menu (tab bar, playback screen, or viewer) SHALL open the monitor, and its on or off state SHALL be remembered. It SHALL work whether the piano and score are open or not.

#### Scenario: Monitor with nothing else open

- **WHEN** a track is playing, the piano and sheet music are closed, and the user opens the monitor
- **THEN** the sung notes appear in the monitor and the transport stays reachable

#### Scenario: Close the monitor

- **WHEN** the user closes the monitor
- **THEN** listening stops unless another surface is using it

### Requirement: Matching is by sounding pitch, with other-octave matches as an opt-in soft tier

The system SHALL classify a detected note against a target note as an exact match when they are the same pitch within a tolerance of 50 cents, a soft match when they are the same note name in a different octave within the same tolerance, and no match otherwise. Exact matches SHALL always be reported. Soft matches SHALL be reported only while the device setting `Show other-octave matches` is on; it SHALL default to off, so a singer who has not opted in sees exact matches only. The setting is meaningful only with a score, so it SHALL be offered only while the sheet music viewer is open (as a row of the `Practice tools` menu there) and SHALL NOT appear in the monitor, the Pitch view, the piano, or any other screen; its value SHALL be remembered on the device. The piano and the Pitch views SHALL always use the real octave.

#### Scenario: Exact match

- **WHEN** the user sings A4 and the target is A4
- **THEN** it is an exact match

#### Scenario: Other octave, setting off

- **WHEN** the user sings A3, the target is A4, and `Show other-octave matches` is off
- **THEN** it is not reported as a match

#### Scenario: Other octave, setting on

- **WHEN** the user sings A3, the target is A4, and `Show other-octave matches` is on
- **THEN** it is reported as a soft match

#### Scenario: Out of tune

- **WHEN** the user sings 60 cents above A4 and the target is A4
- **THEN** it is not a match of either kind

### Requirement: Listening happens only while the app is visible

The system SHALL stop capturing from the microphone whenever the app is not visible (switched away, screen locked, or a hidden web tab), including while a track keeps playing, and SHALL NOT request background microphone access. The user's choice to listen SHALL be kept, so listening resumes on its own, without a permission prompt, when the app is visible again, and the tool SHALL briefly say it was paused while the app was in the background. Playback SHALL be unaffected. Where the platform reports visibility separately from focus, an app that is visible beside another (split view) SHALL keep listening.

#### Scenario: Lock the screen while playing

- **WHEN** the user is listening while a track plays and locks the screen
- **THEN** the track keeps playing and the microphone is no longer in use

#### Scenario: Return to the app

- **WHEN** the user unlocks the phone and returns to the app
- **THEN** listening resumes without a prompt, and the monitor and the Pitch view note it was paused while the app was in the background

#### Scenario: Split view

- **WHEN** the app is visible beside another app on a device that supports it
- **THEN** listening continues

### Requirement: Minimum volume and failure states are visible

The system SHALL offer a `Minimum volume` setting, a cutoff from -60 to -20 dB (default -40 dB), drawn over a live level meter so the user can set it just above the room noise, available from the Pitch view and from a `Pitch detection` page in the app's Settings (shown only where listening is possible); sounds quieter than the cutoff SHALL be ignored, while the clarity gate stays fixed. A choice stored under the earlier Low, Normal, or High setting SHALL carry over once as a cutoff. The system SHALL show a clear state when the microphone is unavailable, interrupted (for example by a call), or taken by another app, and recover when it returns. Pitch detection SHALL assume the user wears headphones: it SHALL NOT try to remove the playing track or the piano from the microphone signal, and SHALL NOT pause detection while the track plays or a piano key sounds. The first time listening starts, the system SHALL tell the user once that it assumes headphones, because sound from speakers reaches the microphone and is detected like singing.

#### Scenario: Interruption

- **WHEN** a phone call interrupts listening and then ends
- **THEN** the display shows that listening was interrupted and resumes on its own

#### Scenario: Headphones assumption

- **WHEN** the user starts listening for the first time
- **THEN** a one-time note says detection assumes headphones, and it does not appear again once dismissed

#### Scenario: Speakers

- **WHEN** the user listens without headphones while the track or a piano key sounds
- **THEN** the sound from the speakers may be detected, and the system makes no attempt to filter it out

### Requirement: The note readout is available to assistive technology without constant announcements

The system SHALL expose the current note (name, octave, and cents) as a labelled value that assistive technology reads when it is focused, and SHALL NOT announce changes continuously through a live region. The Pitch view and monitor SHALL be reachable and operable by keyboard, with every control at least 44 pt, and the state (listening, idle, blocked, paused in the background) SHALL be available as text, not only by colour.

#### Scenario: Screen reader focus

- **WHEN** a screen reader user focuses the note readout while a note is sung
- **THEN** it reads the current note, for example `A3, 8 cents sharp`, and nothing is announced while it is not focused

#### Scenario: State without colour

- **WHEN** the microphone is blocked
- **THEN** the monitor and the Pitch view say so in text as well as by their appearance
