import type { useGoogleDriveAuthorization } from '../../hooks/use-authorization';

export type DriveSessionMenuController = Pick<
  ReturnType<typeof useGoogleDriveAuthorization>,
  | 'authState'
  | 'canClearAuthorization'
  | 'canStartAuthorization'
  | 'clearAuthorization'
  | 'isBusy'
  | 'requestReady'
  | 'startAuthorization'
  | 'statusCopy'
>;
