## ADDED Requirements

### Requirement: Memory is not a hard limit on the number of stems

The system SHALL NOT enforce a fixed stem count or a fixed memory limit for a composite. Every composite SHALL be prepared once into local storage and played from there a window at a time, so that memory use stays bounded by a few windows per stem whatever the number or length of the stems.

#### Scenario: Any size of composite

- **WHEN** a composite has few or many stems, short or long
- **THEN** it is prepared once, then plays from the prepared stems, and playback still starts together and seeks and loops work

#### Scenario: No memory message when nothing is wrong

- **WHEN** a composite is created or played and nothing is wrong
- **THEN** the system shows no message about memory

### Requirement: A composite says it needs preparation on its first play

The system SHALL tell the user, in the create sheet, that a composite is prepared on its first play and takes longer to load then, and SHALL show `Preparing stems · first time only` with progress on that first play. Later opens SHALL read the prepared stems and open quickly. The create sheet SHALL NOT block creation for this reason.

#### Scenario: Create sheet

- **WHEN** the user makes a composite
- **THEN** the sheet shows an informational note that the first play takes longer, and `Create` is available

#### Scenario: First play

- **WHEN** the user plays that composite for the first time
- **THEN** the screen shows `Preparing stems · first time only` with progress and starts when all stems are ready

#### Scenario: Later play

- **WHEN** the user plays it again
- **THEN** it loads from the prepared stems without the preparation state

### Requirement: Prepared stems are a rebuildable cache

The system SHALL keep prepared stems in a local store as a cache that is not the source of truth: each stem SHALL be rebuilt from its track when missing, a prepared stem SHALL be replaced when its track's content changes, and a stem that is mono or has identical channels SHALL be prepared as mono. Prepared stems SHALL be listed in the offline files view with their sizes and SHALL NOT be counted as recordings.

#### Scenario: Missing prepared stem

- **WHEN** a prepared stem was cleared and the user plays the composite
- **THEN** the stem is prepared again from its track

#### Scenario: Track changed

- **WHEN** a stem's track file changed in Drive
- **THEN** the prepared stem is replaced the next time the composite plays

#### Scenario: Mono stem

- **WHEN** a stem's two channels are identical
- **THEN** it is prepared as mono and uses about half the storage

### Requirement: Running out of storage is the only hard stop, and it offers ways to free space

The system SHALL stop preparing or loading a composite only when the device does not have room for its prepared stems. The message SHALL give no counts, SHALL lead with freeing space (a `Clear offline files…` button that opens the existing `Clear all` confirmation, then exporting and deleting recordings in Settings), and SHALL name removing stems or choosing shorter tracks last. In the create sheet, `Create` SHALL be unavailable while this applies.

#### Scenario: Not enough room

- **WHEN** there is not enough room to prepare a composite
- **THEN** the message says so without numbers, offers `Clear offline files…`, and mentions exporting and deleting recordings and then removing stems

#### Scenario: Clearing offline files

- **WHEN** the user chooses `Clear offline files…`
- **THEN** the existing `Clear all` confirmation opens, and after it completes the system tries again

### Requirement: Keeping a composite offline keeps its stems offline

The system SHALL apply `Keep offline` and `Remove from offline` on a composite to every stem's track through the existing actions, with wording that it applies to all of its stems, and SHALL play a composite offline when every stem is available offline or prepared.

#### Scenario: Keep offline

- **WHEN** the user chooses `Keep offline` on a composite
- **THEN** every stem's track is kept offline and the composite shows the offline mark

#### Scenario: Playing offline

- **WHEN** the device is offline and every stem is available locally
- **THEN** the composite plays

#### Scenario: One stem not available offline

- **WHEN** the device is offline and one stem is not available locally
- **THEN** the composite plays the other stems and flags that stem as `Stem missing`
