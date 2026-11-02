import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import { InteractionChip } from '../../components/interaction-chip';
import {
  MenuGroup,
  MenuRow,
} from '../../components/options-menu-sheet/menu-group';
import {
  NEEDS_CONNECTION_FILTER_LABEL,
  NO_RECORDINGS_FILTERS,
  ORIGINAL_CHANGED_FILTER_LABEL,
  RECORDINGS_DRIVE_OPTIONS,
  RECORDINGS_KIND_OPTIONS,
  toggleChoice,
} from '../recordings-library-controls-model';
import type {
  RecordingTrackOption,
  RecordingsFilters,
} from '../recordings-library-model';

const { colors, space, type } = appTheme;

type RecordingsLibraryFilterSheetProps = {
  filters: RecordingsFilters;
  trackOptions: readonly RecordingTrackOption[];
  onChange: (filters: RecordingsFilters) => void;
  onClose: () => void;
};

const Group = ({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) => (
  <View style={styles.group}>
    <Text style={styles.groupTitle}>{title}</Text>
    <View style={styles.chips}>{children}</View>
  </View>
);

/** The `Recordings` view's filter sheet: what kind, where it lives, and which track. */
export const RecordingsLibraryFilterSheet = ({
  filters,
  onChange,
  onClose,
  trackOptions,
}: RecordingsLibraryFilterSheetProps) => (
  <BottomSheetSurface
    footer={
      <MenuGroup>
        <MenuRow
          label="Clear filters"
          onPress={() => onChange(NO_RECORDINGS_FILTERS)}
        />
        <MenuRow label="Done" onPress={onClose} tone="cancel" />
      </MenuGroup>
    }
    isVisible
    onClose={onClose}
    scrollable
    title="Filter recordings"
  >
    <View style={styles.body}>
      <Group title="Kind">
        {RECORDINGS_KIND_OPTIONS.map((option) => (
          <InteractionChip
            accessibilitySelected={filters.kind === option.value}
            key={option.value}
            label={option.label}
            onPress={() =>
              onChange({
                ...filters,
                kind: toggleChoice(filters.kind, option.value),
              })
            }
            variant={filters.kind === option.value ? 'selected' : 'action'}
          />
        ))}
      </Group>
      <Group title="Drive">
        {RECORDINGS_DRIVE_OPTIONS.map((option) => (
          <InteractionChip
            accessibilitySelected={filters.drive === option.value}
            key={option.value}
            label={option.label}
            onPress={() =>
              onChange({
                ...filters,
                drive: toggleChoice(filters.drive, option.value),
              })
            }
            variant={filters.drive === option.value ? 'selected' : 'action'}
          />
        ))}
      </Group>
      <Group title="Needs attention">
        <InteractionChip
          accessibilitySelected={!!filters.originalChanged}
          label={ORIGINAL_CHANGED_FILTER_LABEL}
          onPress={() =>
            onChange({
              ...filters,
              originalChanged: filters.originalChanged ? undefined : true,
            })
          }
          variant={filters.originalChanged ? 'selected' : 'action'}
        />
        <InteractionChip
          accessibilitySelected={!!filters.needsConnection}
          label={NEEDS_CONNECTION_FILTER_LABEL}
          onPress={() =>
            onChange({
              ...filters,
              needsConnection: filters.needsConnection ? undefined : true,
            })
          }
          variant={filters.needsConnection ? 'selected' : 'action'}
        />
      </Group>
      {trackOptions.length > 0 ? (
        <Group title="Track">
          {trackOptions.map((option) => (
            <InteractionChip
              accessibilitySelected={filters.trackId === option.trackId}
              key={option.trackId}
              label={`${option.name} · ${option.count}`}
              onPress={() =>
                onChange({
                  ...filters,
                  trackId: toggleChoice(filters.trackId, option.trackId),
                })
              }
              variant={
                filters.trackId === option.trackId ? 'selected' : 'action'
              }
            />
          ))}
        </Group>
      ) : null}
    </View>
  </BottomSheetSurface>
);

const styles = StyleSheet.create({
  body: { gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  group: { gap: space.xs },
  groupTitle: { ...type.sectionHead, color: colors.textMuted },
});
