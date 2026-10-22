import { detectSheetMusicFormat } from '@org/audio-library-models';

import {
  inspectSheetMusicBytes,
  type SheetMusicContentFormat,
} from '../sheet-music-content';
import { SHEET_MUSIC_MAX_BYTES } from '../sheet-music-loader';
import type { DeviceFile } from './device-file-chooser-types';

/** What the file chooser offers; MuseScore files cannot be shown, so they are left out. */
export const DEVICE_FILE_ACCEPT = '.pdf,.xml,.musicxml,.mxl,.mid,.midi';

// Browsers report no type for `.musicxml` and a text type for `.xml`, so the
// upload uses the format's own type when the file has none.
const FORMAT_UPLOAD_MIME_TYPES: Record<SheetMusicContentFormat, string> = {
  midi: 'audio/midi',
  musicxml: 'application/vnd.recordare.musicxml+xml',
  pdf: 'application/pdf',
};

export type DeviceFileRefusalReason =
  | 'too-large'
  | 'unsupported-type'
  | 'html-page'
  | 'not-musicxml'
  | 'unreadable-encoding'
  | 'wrong-format'
  | 'unreadable';

export const DEVICE_FILE_REFUSAL_COPY: Record<DeviceFileRefusalReason, string> =
  {
    'html-page':
      'That file is a web page, not a score. Save the PDF or MusicXML from the site, then choose it.',
    'not-musicxml': 'That file is text, but it is not a MusicXML score.',
    'too-large': 'Files over 25 MB cannot be saved here.',
    unreadable: 'That file could not be read. Choose it again.',
    'unreadable-encoding':
      'Export the score again as MusicXML in UTF-8 or UTF-16, or as a compressed .mxl file.',
    'unsupported-type':
      'Choose a PDF, MusicXML (.xml, .musicxml, .mxl), or MIDI (.mid, .midi) file.',
    'wrong-format': 'That file is not what its name says it is.',
  };

export type DeviceFileCheck =
  | {
      bytes: Uint8Array;
      format: SheetMusicContentFormat;
      mimeType: string;
      name: string;
      status: 'accepted';
    }
  | { reason: DeviceFileRefusalReason; status: 'refused' };

const refused = (reason: DeviceFileRefusalReason): DeviceFileCheck => ({
  reason,
  status: 'refused',
});

const isViewableFormat = (
  format: ReturnType<typeof detectSheetMusicFormat>,
): format is SheetMusicContentFormat => {
  return format === 'pdf' || format === 'musicxml' || format === 'midi';
};

/**
 * Checks a chosen file before anything is uploaded: a supported type by its
 * name, within the size limit (checked before reading it), and bytes that are
 * what the name claims, so a web page or a wrong file never lands in Drive.
 */
export const checkDeviceFile = async (
  file: DeviceFile,
  maxBytes: number = SHEET_MUSIC_MAX_BYTES,
): Promise<DeviceFileCheck> => {
  const format = detectSheetMusicFormat({
    mimeType: file.mimeType,
    name: file.name,
  });

  if (!isViewableFormat(format)) {
    return refused('unsupported-type');
  }

  if (file.size > maxBytes) {
    return refused('too-large');
  }

  let bytes: Uint8Array;

  try {
    bytes = await file.read();
  } catch {
    return refused('unreadable');
  }

  if (bytes.byteLength > maxBytes) {
    return refused('too-large');
  }

  const inspection = inspectSheetMusicBytes(format, bytes);

  return inspection.isValid
    ? {
        bytes,
        format,
        mimeType: file.mimeType || FORMAT_UPLOAD_MIME_TYPES[format],
        name: file.name,
        status: 'accepted',
      }
    : refused(inspection.reason);
};
