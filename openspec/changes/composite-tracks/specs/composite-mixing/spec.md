## ADDED Requirements

### Requirement: Stems play together from one clock

The system SHALL play all available stems of a composite together, starting at the same instant and staying together through play, pause, seek, loop wrap, and changes of speed and pitch, without audible drift between stems.

#### Scenario: Play and pause

- **WHEN** the user plays a composite and then pauses
- **THEN** all stems start together and stop together and resume from the same position

#### Scenario: Seek

- **WHEN** the user seeks to 1:30
- **THEN** all stems continue from 1:30 together

#### Scenario: Loop wrap

- **WHEN** a loop of the composite wraps
- **THEN** all stems restart at the loop start together and the wrap has no audible gap beyond the existing loop behaviour

#### Scenario: Long play

- **WHEN** a composite plays for ten minutes at 0.7× speed
- **THEN** no stem drifts from the others by an audible amount

### Requirement: The playback screen has a collapsible Mix panel

The system SHALL show a `Mix` panel on the playback screen of a composite with a row per stem. Each row SHALL show the stem's name, `Your part` when it is marked, a mute control, a solo control, and a volume from 0% to 150% (default 100%) with its value. The panel SHALL collapse to one line that shows the active preset and how many stems are sounding.

#### Scenario: Open panel

- **WHEN** the user opens a composite on the playback screen
- **THEN** the panel shows a row per stem with mute, solo and volume

#### Scenario: Collapsed

- **WHEN** the panel is collapsed with `Without Bass` active and one stem muted
- **THEN** the line reads `Without Bass · 3 of 4 sounding`

#### Scenario: Volume above 100%

- **WHEN** the user raises a stem to 150%
- **THEN** that stem plays 1.5 times as loud and the limiter still protects the sum

### Requirement: Mute and solo follow the usual mixer rules

The system SHALL treat a stem as silent when it is muted, or when any stem is soloed and it is not soloed. Mute SHALL win over solo on the same stem. Any number of stems MAY be soloed. A silent stem's row SHALL appear dimmed.

#### Scenario: Solo one

- **WHEN** the user solos Alto
- **THEN** only Alto sounds and the other rows are dimmed

#### Scenario: Solo two

- **WHEN** the user solos Alto and Tenor
- **THEN** Alto and Tenor sound together

#### Scenario: Muted and soloed

- **WHEN** a stem is both muted and soloed
- **THEN** it is silent

#### Scenario: Clearing solo

- **WHEN** the last solo is switched off
- **THEN** every unmuted stem sounds again

### Requirement: Presets set the mix, and changes are a session mix until saved

The system SHALL offer presets from a menu: built-in `All parts` (every stem at 100%), `Without <part>` (the user's part muted) and `<Part> louder` (the user's part at 150% and the others at 70%), and presets the user saved. A change to a stem SHALL make the mix a session mix labelled `Custom mix`, which is not saved until the user chooses `Save as preset`. `Save as preset` SHALL ask for a name and offer to make it the composite's default. The menu SHALL offer `Reset to the saved default`. The session mix SHALL start from the composite's default mix when a composite loads and SHALL NOT carry over to another item.

#### Scenario: Without my part

- **WHEN** the user chooses `Without Bass` and Bass is the user's part
- **THEN** the Bass stem is muted and the other stems play at 100%

#### Scenario: Custom mix

- **WHEN** the user moves a slider after choosing a preset
- **THEN** the preset reads `Custom mix` and nothing is saved

#### Scenario: Saving a preset

- **WHEN** the user chooses `Save as preset`, names it `Bass softer` and saves
- **THEN** it appears under presets saved by the user and can be chosen later

#### Scenario: Default mix

- **WHEN** the user saves a preset as the composite's default and reopens the composite
- **THEN** it starts with that mix

#### Scenario: Changing item

- **WHEN** the user plays another item and comes back
- **THEN** the composite starts from its default mix, not from the last session mix

### Requirement: Speed and pitch apply to the whole mix

The system SHALL apply the playback speed and pitch to the sum of the stems as one signal, not to each stem separately, with the same controls and limits as a track. The sum SHALL pass through the mix limiter, without make-up gain, before the output.

#### Scenario: Speed

- **WHEN** the user sets 0.7× speed
- **THEN** all stems slow together and keep their pitch

#### Scenario: Pitch

- **WHEN** the user sets +2 semitones
- **THEN** the whole mix sounds two semitones higher at the same tempo

#### Scenario: Loud sum

- **WHEN** four stems at 100% would sum above full scale
- **THEN** the limiter keeps the output from clipping and does not raise quiet passages

### Requirement: The waveform follows the mix

The system SHALL draw a composite's waveform from per-stem peaks combined with the current gains, so that it changes when a stem is muted, soloed or its volume changed, and the composite SHALL keep its position, loops and markers on that waveform as a track does.

#### Scenario: Muting a loud stem

- **WHEN** the user mutes the loudest stem
- **THEN** the waveform's amplitude drops accordingly

### Requirement: Playback waits until every stem is ready

The system SHALL show one loading state for a composite with progress per stem and SHALL start playback only when every available stem is ready, so that the mix does not change while the user is singing. A stem that cannot be loaded SHALL be flagged and skipped rather than blocking the others.

#### Scenario: Loading

- **WHEN** the user starts a composite of four stems and two are ready
- **THEN** the screen reads `Loading stems · 2 of 4 ready`, shows each stem's state, and playback has not started

#### Scenario: Superseded

- **WHEN** the user starts another item while a composite is loading
- **THEN** the loading stops, nothing is reported as an error, and the new item plays

### Requirement: A composite behaves like other playback items in the shell

The system SHALL show a playing composite in the mini-player, the queue, playlists and the remote controls like a track, with seek, loops and markers, and SHALL keep the existing playback controls working.

#### Scenario: Mini-player

- **WHEN** a composite is playing and the playback sheet is closed
- **THEN** the mini-player shows its name with play and pause working

#### Scenario: Queue

- **WHEN** a composite is queued after a track
- **THEN** it plays when the track ends and the queue moves on after it
