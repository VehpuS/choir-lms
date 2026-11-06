## ADDED Requirements

### Requirement: Make composite is one of the Library bulk actions

The Library's selection bar SHALL offer `Make composite…` beside the other bulk actions (`Add to playlist`, `Queue`, `Keep offline`) when two or more tracks are selected, with the same standing as the others. The action SHALL be visually emphasised, with a line saying the tracks are all the same length, only when every selected track has the same duration to within one second; otherwise it SHALL look like the other actions and the count line SHALL say the lengths differ.

#### Scenario: Equal lengths

- **WHEN** four tracks of the same duration are selected
- **THEN** `Make composite…` is emphasised and the count line says they are all the same length

#### Scenario: Different lengths

- **WHEN** the selected tracks differ in duration
- **THEN** `Make composite…` looks like the other actions and the count line says the lengths differ

#### Scenario: One track selected

- **WHEN** exactly one track is selected
- **THEN** `Make composite…` is not offered
