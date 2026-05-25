## ADDED Requirements

### Requirement: Users can access rehearsal workflows from a supported web client

The system SHALL provide a browser-accessible rehearsal client that supports the current MVP rehearsal workflows for authorized users.

#### Scenario: Open the rehearsal experience in a browser

- **WHEN** a user opens the supported web client and completes required authentication
- **THEN** the system presents rehearsal library and playback workflows without requiring a native mobile installation

#### Scenario: Unauthenticated users are guided to connect access

- **WHEN** a user reaches the web client without a valid Google Drive authorization state
- **THEN** the system blocks Drive-dependent workflows and guides the user to connect or re-establish authorization

### Requirement: Web and mobile clients share rehearsal behavior contracts

The system SHALL keep domain behavior for saved tracks, loops, playlists, and queue semantics consistent across mobile and web clients.

#### Scenario: Playlist semantics are consistent across clients

- **WHEN** a user plays a saved playlist on web or mobile with equivalent repeat and shuffle settings
- **THEN** the system applies the same item-order and repeat behavior for that playback session

#### Scenario: Saved loop playback respects loop bounds across clients

- **WHEN** a user starts playback of a saved loop on web or mobile
- **THEN** the system constrains playback to the saved start and end range for that loop item

### Requirement: Platform-specific UI can differ while preserving capability outcomes

The system SHALL allow web and mobile UI structures to diverge for form factor and input model differences as long as capability outcomes remain equivalent.

#### Scenario: Navigation differs by platform but preserves destination outcomes

- **WHEN** a user navigates to discovery, search, and personal library workflows on web vs mobile
- **THEN** each client may use platform-appropriate navigation patterns while exposing the same capability-level actions and results

### Requirement: Web playback behavior is explicit about browser constraints

The system SHALL communicate and handle browser-specific playback limitations without silently breaking rehearsal workflows.

#### Scenario: Browser playback limitation affects an action

- **WHEN** a browser policy or unsupported media behavior prevents a playback action from succeeding
- **THEN** the system informs the user of the limitation and preserves enough state to retry or recover without data loss
