/**
 * A track was asked to play from its stored copy alone, and there is none at
 * the version the library knows. `isOffline` picks the message: offline needs
 * a connection, while online the user just has to reconnect Drive.
 */
export class StoredCopyUnavailableError extends Error {
  readonly isOffline: boolean;

  constructor(isOffline: boolean) {
    super('This file is not stored on this device.');
    this.name = 'StoredCopyUnavailableError';
    this.isOffline = isOffline;
  }
}
