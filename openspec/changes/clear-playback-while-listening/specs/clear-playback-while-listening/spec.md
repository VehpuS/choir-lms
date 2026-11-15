## ADDED Requirements

### Requirement: Clear playback while the microphone is open in the iOS app

In the iOS app, playback SHALL stay at its normal stereo quality on Bluetooth earbuds while pitch detection is listening. The app SHALL capture from the phone's microphone, or a wired or USB one, and SHALL NOT put the earbuds in their hands-free call mode.

#### Scenario: A queue with pitch detection on

- **WHEN** a queue plays through Bluetooth earbuds in the iOS app with pitch detection on
- **THEN** each song stays at its normal quality from its start to its end, including after a pause and resume
- **AND** the sung note is detected from the phone's microphone

#### Scenario: Pitch detection is turned on during playback

- **WHEN** a person turns pitch detection on while a track is playing through Bluetooth earbuds
- **THEN** playback continues on the earbuds at its normal quality

#### Scenario: Pitch detection is turned off

- **WHEN** the last listener of the microphone closes
- **THEN** the app returns to its playback-only audio session

#### Scenario: Choosing a microphone with Bluetooth earbuds connected

- **WHEN** a person opens the microphone choice in the iOS app with Bluetooth earbuds connected
- **THEN** the earbuds' microphone is not offered
- **AND** the app says that the phone's microphone is used so the earbuds keep their normal sound

### Requirement: The web app says where it cannot keep playback clear

On iPhone and iPad browsers, where the page cannot keep Bluetooth earbuds out of their call mode while a microphone is open, the app SHALL say so where the microphone is turned on and SHALL name what sounds better.

#### Scenario: Turning the microphone on in an iPhone browser

- **WHEN** a person is asked to choose or allow a microphone in the web app on an iPhone or iPad
- **THEN** the app says that Bluetooth earbuds sound thin while it listens
- **AND** names the speaker and wired earphones as sounding normal

#### Scenario: Other browsers

- **WHEN** a person turns the microphone on in a browser that is not on an iPhone or iPad
- **THEN** the notice is not shown

#### Scenario: No setting that cannot work

- **WHEN** a person opens Settings > Microphone in the web app
- **THEN** there is no "Sound while listening" setting
