import { formatByteSize } from '../../offline/format-byte-size';
import type { PreparedCompositeUsage } from './prepared-stem-types';

/**
 * What the offline files view says about prepared composite stems (composite-
 * tracks 9.1): a cache of audio made from each composite's stems, listed with
 * its size and cleared with the other offline files. Clearing it removes no
 * composite, track or recording; a composite prepares again when next played.
 */

export const PREPARED_COMPOSITES_COPY = {
  groupTitle: 'Prepared composites',
  cacheNote: 'made again when a composite is next played',
  deletedComposite: 'Deleted composite',
} as const;

export type PreparedCompositeRow = {
  compositeId: string;
  name: string;
  stemCount: number;
  stemsLabel: string;
  sizeBytes: number;
  sizeLabel: string;
};

export type PreparedCompositesSummary = {
  count: number;
  totalBytes: number;
  /** `54 MB · made again when a composite is next played`, the group line. */
  groupLine: string;
  rows: PreparedCompositeRow[];
};

const stemsLabel = (count: number) =>
  count === 1 ? '1 stem' : `${count} stems`;

export const buildPreparedCompositesSummary = (
  usage: readonly PreparedCompositeUsage[],
  composites: readonly { id: string; name: string }[],
): PreparedCompositesSummary => {
  const names = new Map(composites.map(({ id, name }) => [id, name]));
  const rows = usage
    .map((entry) => ({
      compositeId: entry.compositeId,
      name:
        names.get(entry.compositeId) ??
        PREPARED_COMPOSITES_COPY.deletedComposite,
      stemCount: entry.stemCount,
      stemsLabel: stemsLabel(entry.stemCount),
      sizeBytes: entry.sizeBytes,
      sizeLabel: formatByteSize(entry.sizeBytes),
    }))
    .sort((a, b) => b.sizeBytes - a.sizeBytes);
  const totalBytes = rows.reduce((sum, row) => sum + row.sizeBytes, 0);

  return {
    count: rows.length,
    totalBytes,
    groupLine: `${formatByteSize(totalBytes)} · ${PREPARED_COMPOSITES_COPY.cacheNote}`,
    rows,
  };
};
