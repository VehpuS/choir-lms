## ADDED Requirements

### Requirement: Save actions show consistent, non-stale acknowledgment

The system SHALL give the user the same kind of persistent, explicitly-dismissible success acknowledgment after every save action that adds an item to the personal library, and SHALL avoid resurfacing an old acknowledgment as though it were the result of an action the user just took.

#### Scenario: Saving a track from Add matches the loop-save acknowledgment pattern

- **WHEN** a user saves a Drive source into the library from a Add browse or search result row
- **THEN** the system shows a persistent success card naming the saved item, with an explicit dismiss action, the same as the existing loop-save acknowledgment
- **AND** the row's control state (for example swapping `Save` for a management affordance) is not the only feedback shown

#### Scenario: A dismissed or stale acknowledgment does not reappear as new

- **WHEN** a user navigates away from a screen that showed an undismissed save acknowledgment and later returns to that screen without taking a new matching save action
- **THEN** the system does not present that earlier acknowledgment as though it just resulted from a fresh action
- **AND** an acknowledgment already explicitly dismissed by the user stays dismissed when the user returns to that screen
