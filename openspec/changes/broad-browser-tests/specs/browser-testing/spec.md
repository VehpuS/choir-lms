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
