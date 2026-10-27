## ADDED Requirements

### Requirement: The piano shows the sung note on the matching key

While pitch detection is listening and the piano is open, the keyboard SHALL show a detected state on the key whose note matches the sung note, only when that key is in view. The detected state SHALL be visually distinct from the pressed state and SHALL NOT sound the key. When the matching key is scrolled out of view, the keyboard SHALL show an indicator on the edge toward it. The marks SHALL follow the matching rules of `pitch-detection` and SHALL NOT move the strip.

#### Scenario: Sing a note in view

- **WHEN** the piano is open with C4 to C5 in view and the user sings A4
- **THEN** the A4 key shows the detected state and no sound plays

#### Scenario: Sung note out of view

- **WHEN** the user sings a note below the visible keys
- **THEN** an indicator appears on the left edge and the strip does not scroll

#### Scenario: Pressed and detected together

- **WHEN** the user holds A4 while singing A4
- **THEN** the key shows both states distinguishably

#### Scenario: Headphones are assumed

- **WHEN** the user presses a key and the piano's own sound reaches the microphone (no headphones)
- **THEN** the system does not suppress detection, and the key may show the detected state, as `pitch-detection` assumes headphones
