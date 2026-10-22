import { decodeMusicXmlBytes } from '../musicxml-encoding';
import { hasMusicXmlRoot } from '../sheet-music-content';

const CONTAINER_PATH = 'META-INF/container.xml';
const ROOTFILE_PATH_PATTERN =
  /<rootfile\b[^>]*\bfull-path\s*=\s*(?:"([^"]*)"|'([^']*)')/;
const XML_ENTRY_PATTERN = /\.(?:xml|musicxml)$/i;
const META_INF_PREFIX = 'META-INF/';

/**
 * Reads the MusicXML text out of a compressed `.mxl`: the file named by
 * `META-INF/container.xml`, else the first XML file outside `META-INF`.
 */
const readCompressedMusicXml = async (
  bytes: Uint8Array,
): Promise<string | null> => {
  // jszip is large and only needed here, so it loads on demand.
  const { default: JSZip } = await import('jszip');
  const archive = await JSZip.loadAsync(bytes);
  const container = await archive.file(CONTAINER_PATH)?.async('string');
  const rootPath = container
    ? (ROOTFILE_PATH_PATTERN.exec(container)?.[1] ??
      ROOTFILE_PATH_PATTERN.exec(container)?.[2])
    : undefined;
  const rootEntry = rootPath ? archive.file(rootPath) : null;
  const fallbackEntry = Object.values(archive.files).find(
    (entry) =>
      !entry.dir &&
      !entry.name.startsWith(META_INF_PREFIX) &&
      XML_ENTRY_PATTERN.test(entry.name),
  );
  const text = await (rootEntry ?? fallbackEntry)?.async('string');

  return text ?? null;
};

/**
 * Returns the MusicXML text of a loaded score, unzipping a `.mxl` first, or
 * null when the bytes do not hold a MusicXML score. Never throws.
 */
export const readMusicXmlText = async (
  bytes: Uint8Array,
  isCompressed: boolean,
): Promise<string | null> => {
  try {
    const text = isCompressed
      ? await readCompressedMusicXml(bytes)
      : decodeMusicXmlBytes(bytes);

    if (text === null || text === undefined) {
      return null;
    }

    // An unzipped file is checked like a plain download, so a zip holding
    // something other than a score is refused here.
    return hasMusicXmlRoot(text) ? text : null;
  } catch {
    return null;
  }
};
