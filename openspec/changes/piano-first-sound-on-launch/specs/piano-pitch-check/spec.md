## ADDED Requirements

### Requirement: The first sound on a fresh launch

The piano SHALL be audible from its first key after the app has been closed and reopened, and SHALL NOT drop or delay a key because its recordings have not finished loading.

#### Scenario: Recordings are fetched when the app starts

- **WHEN** the app has started and the piano has not been opened
- **THEN** the recordings have been fetched in the background, unless the person is on a data-saver or very slow connection

#### Scenario: Opening the piano after the warm-up

- **WHEN** the piano is opened after the recordings were fetched
- **THEN** it fetches nothing more

#### Scenario: A key pressed while the recordings load

- **WHEN** a key is pressed before the recordings have arrived
- **THEN** it sounds at once, through the fallback voice, and is not queued or discarded

#### Scenario: A key after the recordings have arrived

- **WHEN** a key is pressed after the recordings have loaded
- **THEN** the recorded piano plays it

#### Scenario: A failed load is tried again

- **WHEN** the recordings failed to load and a later press or open comes at least 10 seconds after the failure
- **THEN** loading is attempted again, and the recordings are used once they arrive

### Requirement: The playback audio session

Where the browser has an audio session, the piano SHALL ask for the `playback` type while it is in use, and SHALL restore the previous type when it closes.

#### Scenario: Opening the piano

- **WHEN** the piano opens
- **THEN** the audio session type is `playback`

#### Scenario: Closing the piano

- **WHEN** the piano closes
- **THEN** the audio session type is what it was before the piano opened

#### Scenario: No audio session

- **WHEN** the browser has no audio session
- **THEN** the piano behaves as before

### Requirement: The microphone has priority over the playback session

The piano's request for the `playback` audio session SHALL NOT apply while the microphone is open, and SHALL apply again when it closes if the piano is still open.

#### Scenario: Pitch detection with the piano open

- **WHEN** the piano is open and pitch detection or recording starts listening
- **THEN** the microphone is available (not "No microphone found") and stays available while both are open

#### Scenario: Opening the piano while listening

- **WHEN** pitch detection is listening and the piano opens
- **THEN** the microphone keeps listening

#### Scenario: The microphone closes

- **WHEN** the microphone closes while the piano is still open
- **THEN** the audio session type is `playback` again
