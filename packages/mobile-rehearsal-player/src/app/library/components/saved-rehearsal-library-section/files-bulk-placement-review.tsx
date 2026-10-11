import type {
  PlacementMode,
  PlacementPlanEntry,
  PlacementResolution,
} from '@org/audio-library-runtime';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { SegmentedControl } from '../../../components/segmented-control';
import { appTheme } from '../../../utils/theme';
import type { LibraryFilesIssue } from '../../saved-rehearsal-library/library-files-operation-helpers';
import { BottomSheetSurface } from '../bottom-sheet-surface';
import { FeedbackCard } from '../feedback-card';
import { getPlacementEntryDescription } from './files-bulk-copy';

const LIST_MAX_HEIGHT = 320;
const RESOLUTION_OPTIONS = [
  { label: 'Keep both', value: 'keep-both' },
  { label: 'Skip', value: 'skip' },
] as const;

type FilesBulkPlacementReviewProps = {
  destinationName: string;
  entries: readonly PlacementPlanEntry[];
  isMutating: boolean;
  issue: LibraryFilesIssue | null;
  mode: PlacementMode;
  onCancel: () => void;
  onConfirm: () => void;
  onResolve: (itemId: string, resolution: PlacementResolution) => void;
  resolutions: Readonly<Record<string, PlacementResolution>>;
};

/** How many items the confirmation will place, given the choices so far. */
export const countPlaceableEntries = (
  entries: readonly PlacementPlanEntry[],
  resolutions: Readonly<Record<string, PlacementResolution>>,
) =>
  entries.filter(
    (entry) =>
      entry.status === 'ready' ||
      (entry.status === 'conflict' &&
        resolutions[entry.itemId] === 'keep-both'),
  ).length;

// One list for every name clash and invalid target of a copy or move, with
// keep-both or skip per item, instead of a dialog per item (design Decision 10).
export const FilesBulkPlacementReview = ({
  destinationName,
  entries,
  isMutating,
  issue,
  mode,
  onCancel,
  onConfirm,
  onResolve,
  resolutions,
}: FilesBulkPlacementReviewProps) => {
  const needsAttention = entries.filter(({ status }) => status !== 'ready');
  const placeableCount = countPlaceableEntries(entries, resolutions);
  const verb = mode === 'copy' ? 'Copy' : 'Move';

  return (
    <BottomSheetSurface
      eyebrow={`${needsAttention.length} need${needsAttention.length === 1 ? 's' : ''} a decision`}
      isVisible
      onClose={onCancel}
      title={`${verb} to ${destinationName}`}
    >
      <ScrollView style={styles.list}>
        {needsAttention.map((entry) => (
          <View key={entry.itemId} style={styles.entry}>
            <Text numberOfLines={1} style={styles.entryName}>
              {entry.name}
            </Text>
            <Text style={styles.entryDescription}>
              {getPlacementEntryDescription(entry, mode)}
            </Text>
            {entry.status === 'conflict' ? (
              <SegmentedControl
                accessibilityLabel={`${entry.name}: keep both or skip`}
                onSelect={(value) => {
                  onResolve(entry.itemId, value);
                }}
                options={RESOLUTION_OPTIONS}
                selectedValue={resolutions[entry.itemId] ?? 'skip'}
              />
            ) : (
              <Text style={styles.entryLeftOut}>Left out</Text>
            )}
          </View>
        ))}
      </ScrollView>
      {issue ? (
        <FeedbackCard
          message={issue.message}
          size="compact"
          title={issue.title}
          tone="error"
        />
      ) : null}
      <View style={styles.actions}>
        <OutlinedActionButton
          disabled={isMutating}
          fill
          label="Cancel"
          onPress={onCancel}
        />
        <OutlinedActionButton
          disabled={isMutating || placeableCount === 0}
          fill
          label={
            isMutating
              ? 'Working…'
              : `${verb} ${placeableCount} ${placeableCount === 1 ? 'item' : 'items'}`
          }
          onPress={onConfirm}
          variant="accent"
        />
      </View>
    </BottomSheetSurface>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
  },
  entry: {
    gap: appTheme.space.xs,
    paddingVertical: appTheme.space.sm,
  },
  entryDescription: {
    color: appTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  entryLeftOut: {
    color: appTheme.colors.textSecondary,
    fontSize: 13,
  },
  entryName: {
    ...appTheme.type.rowTitle,
    color: appTheme.colors.text,
  },
  list: {
    maxHeight: LIST_MAX_HEIGHT,
  },
});
