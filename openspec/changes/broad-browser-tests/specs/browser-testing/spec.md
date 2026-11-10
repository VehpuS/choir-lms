## ADDED Requirements

### Requirement: Browser scenarios run offline

Every browser scenario SHALL run against the local web export with mocked Drive, media and microphone, and SHALL fail if the page requests any host that the scenario did not declare as a mock.

#### Scenario: An unmocked request fails the scenario

- **WHEN** a scenario causes the app to request an external host it did not mock
- **THEN** the request is blocked and the scenario fails naming that URL

#### Scenario: No credentials are needed

- **WHEN** the browser suite runs in a fresh environment with Chromium installed
- **THEN** it needs no Google sign-in, API key or network access

### Requirement: Deterministic media

The helpers SHALL provide a generated tone file of known length served as Drive media and as a web link, and a fake microphone stream, so playback, loop, marker and recording flows can be asserted without audible output or timing sleeps.

#### Scenario: Play a mock track

- **WHEN** a scenario plays a track backed by the generated tone
- **THEN** the playback state, position and duration can be asserted and the player can seek within the file

#### Scenario: Record with the fake microphone

- **WHEN** a scenario records a take
- **THEN** the take is saved and listed without real audio hardware

#### Scenario: Pitches from a real stem

- **WHEN** a scenario feeds the committed choir stem to the pitch detector through the fake microphone
- **THEN** the detected notes are E4, then C#4, then C4

#### Scenario: A real compressed file plays

- **WHEN** a scenario plays the stem as an AAC `.m4a` Drive file
- **THEN** it decodes and plays through the same path as a real Drive file

### Requirement: Coverage of user-critical flows

The suite SHALL contain at least one scenario for each area listed in the design: shell navigation, library tracks and files, playlists, loops, playback and queue, markers and lyrics, tags and search, Drive flows, backup/restore/share, recordings, composite tracks, settings and sheet music.

#### Scenario: Every listed area is covered

- **WHEN** the browser suite is listed
- **THEN** each area in the design maps to at least one scenario file

### Requirement: Failures leave evidence

A failing scenario SHALL write a screenshot, a trace and the console errors it saw to the output directory, and CI SHALL upload them.

#### Scenario: A scenario fails in CI

- **WHEN** a scenario fails in the `browser` CI job
- **THEN** the run's artifacts include its failure screenshot and trace

### Requirement: Scenarios are easy to run and write

`browser-test` SHALL accept a scenario filter, and shared helpers and fixture builders SHALL cover setup that more than one scenario repeats, so a scenario reads as steps rather than setup.

#### Scenario: Run one scenario

- **WHEN** an agent runs `browser-test` with `--scenario=rename`
- **THEN** only scenarios whose file name contains `rename` run

### Requirement: Agents are told to use and extend the suite

Repository agent guidance SHALL tell future sessions to add or extend a browser scenario with new user-visible behavior, to reproduce reported web bugs as a failing scenario first, and to use the suite for behavior validation, through a `browser-test-coverage` skill referenced from `AGENTS.md`, `CLAUDE.md` and the testing policy.

#### Scenario: A bug report arrives

- **WHEN** a session is asked to fix a web-reproducible bug
- **THEN** the guidance directs it to write a failing scenario before the fix and keep it afterwards

### Requirement: Fixtures follow the code

Library bundles used by backup, restore and import scenarios SHALL be generated with the runtime's bundle builder, not stored as frozen files, and committed media and score fixtures SHALL be small and live under `src/test-support/fixtures/`.

#### Scenario: Bundle format changes

- **WHEN** the bundle format gains an upgrade step
- **THEN** the restore scenario exercises it without editing a stored bundle

### Requirement: Slowed playback stays clean across devices

The suite SHALL measure the audio the web engine produces at reduced speeds and shifted pitch and SHALL fail on pitch drift, clicks, dropouts, clipping or large loudness changes, on a quick device profile for every run and on a full device matrix (device descriptors, CPU throttling and audio sample rates) through a separate target.

#### Scenario: Half speed keeps the pitch

- **WHEN** a scenario plays the stem at 0.5x with pitch preserved
- **THEN** the detected notes are still E4, C#4 and C within the tolerance

#### Scenario: A slow device does not drop audio

- **WHEN** the scenario plays at 0.5x with the CPU throttled 4x
- **THEN** the captured output has no silent gap inside a sounding region longer than the allowed limit

#### Scenario: Readout and engine agree

- **WHEN** a user sets speed to 0.5x
- **THEN** the readout, the media element's `playbackRate` and the shaper's tempo all report 0.5x

### Requirement: Long and full-size fixtures

Scenarios SHALL include a multi-minute track and the full-length score and MIDI fixtures, not only short samples.

#### Scenario: Seek late in a long track

- **WHEN** a scenario seeks near the end of a ten-minute tone track
- **THEN** the position, progress bar and a loop set there behave as in a short track
