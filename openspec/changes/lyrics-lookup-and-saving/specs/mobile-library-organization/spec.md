## ADDED Requirements

### Requirement: Saved track menus offer lyrics in every Library view

The shared saved-item menu SHALL offer `Lyrics` on a track that has none and `Edit lyrics` on one that has lyrics, in every Library view and on Recents, Up Next, and the playback sheet menus that share it, with one icon from the shared menu icon map. Loops and adjusted tracks SHALL offer the same action, which opens the editor for the owning track. The action SHALL be placed with the item's other organizing actions (after `Edit tags`) and SHALL NOT appear in bulk action menus.

#### Scenario: Track without lyrics

- **WHEN** a user opens the menu of a track that has no lyrics
- **THEN** the menu offers `Lyrics`, which opens the lyrics editor

#### Scenario: Track with lyrics

- **WHEN** a user opens the menu of a track that has lyrics
- **THEN** the menu offers `Edit lyrics` in the same position

#### Scenario: Loop menu opens the owning track's lyrics

- **WHEN** a user chooses `Lyrics` on a loop
- **THEN** the editor opens for the loop's track and its subtitle names that track

#### Scenario: Not offered in bulk menus

- **WHEN** a user opens the bulk action menu over a selection
- **THEN** it does not offer a lyrics action

### Requirement: Saved track menus offer sheet music as a quiet option

The shared saved-item menu SHALL offer `Sheet music` on tracks, loops, and adjusted tracks in the same menus that offer lyrics, placed immediately after `Lyrics` / `Edit lyrics`, with one icon from the shared menu icon map. The label SHALL stay `Sheet music` whether or not sources are attached, it SHALL open the manager sheet for the owning track, and it SHALL NOT appear in bulk action menus. Removing or adjusting a track SHALL follow the same rules for sheet music links as for lyrics.

#### Scenario: Track menu

- **WHEN** a user opens the menu of any saved track
- **THEN** it offers `Sheet music` directly after `Lyrics` or `Edit lyrics`

#### Scenario: Loop menu opens the owning track's sources

- **WHEN** a user chooses `Sheet music` on a loop
- **THEN** the manager sheet opens for the loop's track and its subtitle names that track

#### Scenario: Not offered in bulk menus

- **WHEN** a user opens the bulk action menu over a selection
- **THEN** it does not offer a sheet music action
