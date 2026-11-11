# recents-tag-navigation Specification

## Purpose
TBD - created by syncing change recents-tag-integration. Update Purpose after archive.
## Requirements
### Requirement: Recents surfaces tags actually in use across the saved library

The system SHALL replace the static placeholder shortcut chips on Recents with a derived list of tags present on saved tracks, loops, playlists, and folders, using the same tag normalization (trim, whitespace collapse, case-insensitive dedupe) already applied by the tag editor.

#### Scenario: Tag list reflects real saved-library tags

- **WHEN** a user opens Recents and has tagged one or more saved tracks, loops, playlists, or folders
- **THEN** the Recents tag module shows those tags instead of the previous fixed `Soprano`/`Alto`/`Tenor`/`Bass`/`Warmup` placeholder set
- **AND** a tag applied with different casing or surrounding whitespace on different entities appears once in the list

#### Scenario: No tags exist yet

- **WHEN** a user opens Recents and no saved entity carries any tag
- **THEN** the Recents tag module shows concise empty-state guidance instead of an empty or placeholder chip row
- **AND** the module does not present non-functional example tags as if they were real

#### Scenario: Tag list stays compact with an overflow path

- **WHEN** more distinct tags exist than the Recents module's compact display cap
- **THEN** the module shows the most-used tags first, up to the cap, ordered by number of tagged entities with an alphabetical tie-break
- **AND** the module exposes a path to the full tag list rather than silently hiding the remaining tags

### Requirement: Library provides a dedicated Tags view listing every in-use tag with usage counts

The system SHALL add a Tags view to Library's existing Files/Tracks/Loops/Playlists view-switcher that lists every distinct in-use tag with its usage count, lets the user sort that list by tag name or usage count in ascending or descending order, and lets the user search the list by tag name. This view SHALL be independently reachable from Library at any time, not only via the Recents overflow action.

#### Scenario: Library Tags view lists every distinct tag with usage counts

- **WHEN** a user selects the Tags view in Library
- **THEN** the system lists every distinct tag present across saved tracks, loops, playlists, and folders, each row showing the tag name and the number of entities carrying it

#### Scenario: Sorting the Library Tags view

- **WHEN** a user selects a sort option (name or usage count, ascending or descending) on the Library Tags view
- **THEN** the list reorders according to the selected sort option

#### Scenario: Searching the Library Tags view

- **WHEN** a user enters a search query on the Library Tags view
- **THEN** the visible list narrows to tags whose name contains the query

#### Scenario: Opening a tag from the Library Tags view

- **WHEN** a user taps a tag row on the Library Tags view
- **THEN** the system opens the tag detail view for that tag

#### Scenario: Recents overflow opens the Library Tags view

- **WHEN** a user taps the Recents tag module's overflow action
- **THEN** the system opens the Library Tags view

### Requirement: Tapping a tag opens a filterable list of everything tagged with it

The system SHALL provide a tag detail view that lists every saved track, loop, playlist, and folder carrying the selected tag, and SHALL let the user sort, narrow by entity type, and narrow by text search.

#### Scenario: Tag detail lists all directly tagged entities

- **WHEN** a user opens a tag with tagged tracks, loops, playlists, and folders
- **THEN** the tag detail view lists each of those items using the same row presentation as its native view (saved-track row, saved-loop row, playlist card, Files folder row), in a single flat list not grouped by entity type

#### Scenario: Sorting the tag detail match list

- **WHEN** a user selects a sort option (name, type, or date added, ascending or descending) on the tag detail view
- **THEN** the visible match list reorders according to the selected sort option

#### Scenario: Type filter narrows the visible matches

- **WHEN** a user selects a subset of entity types (tracks, loops, playlists, folders) on the tag detail view
- **THEN** the visible list shows only matches of the selected types
- **AND** clearing the type filter restores the full match list for the tag

#### Scenario: Search narrows matches within the active tag

- **WHEN** a user enters a search query on the tag detail view
- **THEN** the visible list narrows to matches whose name contains the query, within the tag's own matches and the currently selected type filter
- **AND** the search is scoped to this tag's matches only, not the full saved library

### Requirement: Playing a tag queues its resolved contents through the existing queue system

The system SHALL let a user start playback of a tag's currently visible (filtered) matches, expanding tagged playlists and folders into their contained tracks and loops, using the same queue/session mechanism as playlist and `Play next`/`Add to queue` playback.

#### Scenario: Playing an unfiltered tag queues all of its resolved contents

- **WHEN** a user presses play on a tag detail view with no type or search filter active
- **THEN** the system builds an ordered playback queue containing every tagged track and loop directly, plus every track and loop contained in every tagged playlist (in playlist order) and every tagged folder (including nested subfolders)
- **AND** playback starts from the first item in that queue

#### Scenario: Playing a filtered tag queues only the filtered subset

- **WHEN** a user has narrowed the tag detail view with a type filter, a search query, or both, and then presses play
- **THEN** the system queues only the tracks and loops resolved from the currently visible filtered matches, not the tag's full unfiltered contents

#### Scenario: A track reachable through multiple matches under the same tag queues once

- **WHEN** the resolved playback set for a tag would otherwise include the same underlying track or loop more than once, for example because it is both tagged directly and contained in a tagged folder
- **THEN** the system includes that track or loop exactly once in the resulting queue

#### Scenario: Tag playback behaves like any other queue session

- **WHEN** a user has started playback from a tag
- **THEN** the active queue is visible and controllable through the existing Up Next view, including transport, reorder, remove, and repeat/shuffle controls, the same as playlist-originated or transient-queue playback

### Requirement: Folder and playlist tag matches stay navigable as themselves outside of playback

The system SHALL let a user open a tagged folder or tagged playlist from the tag detail view into its normal browsing surface, independent of the queue-expansion behavior used for playback.

#### Scenario: Opening a tagged folder match

- **WHEN** a user taps a folder row in a tag detail view, outside of the play action
- **THEN** the system opens Library Files at that folder, the same as opening it from Files browsing directly

#### Scenario: Opening a tagged playlist match

- **WHEN** a user taps a playlist row in a tag detail view, outside of the play action
- **THEN** the system opens that playlist's detail view, the same as opening it from the Playlists view directly

### Requirement: The tag editor suggests popular and matching existing tags

The system SHALL show the user a row of suggested tags inside the tag editor for tracks, loops, playlists, and folders: the library's most-used tags when no tag is currently being typed, and existing tags matching the tag currently being typed once the user starts typing, always excluding tags already applied to the entity being edited. This SHALL remain consistent with the tag input's existing support for entering multiple tags at once, separated by commas.

#### Scenario: Popular tags are suggested when no tag is being typed

- **WHEN** a user opens the tag editor for any entity and the tag input is empty
- **THEN** the system shows a row of suggested tag chips populated with the library's most-used tags, ranked by usage
- **AND** tags already applied to the entity being edited do not appear as suggestions

#### Scenario: Suggestions narrow to matching existing tags while typing

- **WHEN** a user types text into the tag input
- **THEN** the suggestion row narrows to existing library tags whose name contains the typed text
- **AND** the suggestion row updates live as the typed text changes

#### Scenario: Suggestions reflect only the tag currently being typed when entering multiple tags at once

- **WHEN** a user has already typed one or more complete tags separated by commas in the tag input, and is now typing another tag after the most recent comma
- **THEN** the suggestion row filters based only on the text typed since that last comma, not the full input
- **AND** the tags already typed earlier in that same input are unaffected by the suggestion row

#### Scenario: Selecting a suggested tag commits only the tag currently being typed

- **WHEN** a user taps a suggested tag chip
- **THEN** the selected tag is added to the entity's draft tags immediately, without requiring a separate submit action
- **AND** the text of the tag currently being typed is cleared from the tag input
- **AND** any tags already typed earlier in the same input, before the most recent comma, remain in the input unchanged and still uncommitted, the same as before the tap
- **AND** the tapped tag no longer appears in the suggestion row

#### Scenario: No suggestions available

- **WHEN** there are no existing library tags to suggest, or every eligible tag is already applied to the entity being edited
- **THEN** the suggestion row does not render
