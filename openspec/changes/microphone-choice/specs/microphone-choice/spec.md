## ADDED Requirements

### Requirement: Choosing the microphone

The app SHALL let the person choose which microphone input pitch detection and recording use, and SHALL remember the choice when asked.

#### Scenario: The remembered input is used

- **WHEN** a remembered input is connected and the microphone starts
- **THEN** that input is opened and no prompt is shown

#### Scenario: Asking when there is a choice to make

- **WHEN** the microphone starts, more than one input exists and nothing is remembered
- **THEN** a prompt lists the inputs, offers "Remember my choice" and Continue, and the chosen input is opened

#### Scenario: One input needs no prompt

- **WHEN** only one input exists
- **THEN** it is opened and no prompt is shown

#### Scenario: Remembering the choice

- **WHEN** the person continues with "Remember my choice" on
- **THEN** the same input is opened without a prompt next time

#### Scenario: Dismissing the prompt

- **WHEN** the person closes the prompt without continuing
- **THEN** the system's choice is used this once and nothing is remembered

#### Scenario: A remembered input is not connected

- **WHEN** the remembered input is not connected when the microphone starts
- **THEN** the system's choice is used without an error and the remembered choice is kept

### Requirement: Microphone settings

Settings SHALL show and change the remembered microphone choice.

#### Scenario: Changing it in Settings

- **WHEN** the person picks Automatic, an input or Ask each time in the Microphone category
- **THEN** the next start follows that choice, and the prompt, if shown, reflects it

#### Scenario: A remembered input that is not connected

- **WHEN** the remembered input is not connected
- **THEN** Settings still lists it, marked as not connected

#### Scenario: Platforms without capture

- **WHEN** the platform cannot capture the microphone
- **THEN** the category is not shown
