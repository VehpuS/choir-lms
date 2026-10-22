/** A file the user picked on this device; its bytes are read only when asked. */
export type DeviceFile = {
  mimeType: string;
  name: string;
  read: () => Promise<Uint8Array>;
  size: number;
};

export type DeviceFileChoice =
  | { file: DeviceFile; status: 'chosen' }
  | { status: 'cancelled' }
  /** This platform has no file chooser yet (native; see native-playback-follow-ups). */
  | { status: 'unsupported' };
