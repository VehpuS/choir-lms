import { Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { FadedRule } from '../../../components/faded-rule';
import { SegmentedControl } from '../../../components/segmented-control';
import { appTheme } from '../../../utils/theme';
import { InteractionChip } from '../../components/interaction-chip';
import {
  buildFilesSearchScopeOptions,
  ENTITY_FILTER_OPTIONS,
  FilterChipGroup,
} from './library-search-filter-groups';
import type { LibrarySearchFilterPopoverProps } from './library-search-filter-popover-types';
import { LibrarySearchSortBlock } from './library-search-sort-block';
import { TagFilterMatchModeSwitch } from './tag-filter-match-mode-switch';

const TAG_CHIP_ICON_SIZE = 14;
const { colors, space } = appTheme;

// Screen 1j's filter sections, in its order: Scope and Show (Files only),
// Tags with its Any / All switch, then the view's sort block, separated by
// faded rules. Which sections appear, and every handler, are unchanged.
export const LibrarySearchFilterPopover = (
  props: LibrarySearchFilterPopoverProps,
) => {
  const {
    availableTagFilters,
    currentFilesFolderName,
    entityFilter,
    filesSearchScope,
    onSelectEntityFilter,
    onSelectFilesSearchScope,
    onSelectTagFilterMatchMode,
    onToggleTagFilter,
    selectedTagFilters,
    selectedView,
    tagFilterMatchMode,
  } = props;
  const sections: Array<{ key: string; node: ReactNode }> = [];

  if (selectedView === 'files') {
    sections.push({
      key: 'files-filters',
      node: (
        <View style={styles.sectionColumn}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Scope</Text>
            <SegmentedControl
              accessibilityLabel="Files search scope"
              onSelect={onSelectFilesSearchScope}
              options={buildFilesSearchScopeOptions(currentFilesFolderName)}
              selectedValue={filesSearchScope}
            />
          </View>
          <FilterChipGroup
            filterChipStyle={undefined}
            filterGroupStyle={styles.filterGroup}
            filterLabelStyle={styles.filterLabel}
            filterRowStyle={styles.filterRow}
            label="Show"
            onSelectValue={onSelectEntityFilter}
            options={ENTITY_FILTER_OPTIONS}
            selectedValue={entityFilter}
          />
        </View>
      ),
    });
  }

  if (availableTagFilters.length > 0) {
    sections.push({
      key: 'tags',
      node: (
        <View style={styles.filterGroup}>
          <View style={styles.filterLabelRow}>
            <Text style={styles.filterLabel}>Tags</Text>
            <TagFilterMatchModeSwitch
              matchMode={tagFilterMatchMode}
              onSelectMatchMode={onSelectTagFilterMatchMode}
            />
          </View>
          <View style={styles.filterRow}>
            {availableTagFilters.map((tagFilter) => {
              const isSelected = selectedTagFilters.includes(tagFilter);

              return (
                <InteractionChip
                  accessibilityLabel={
                    isSelected
                      ? `Remove tag filter ${tagFilter}`
                      : `Filter by tag ${tagFilter}`
                  }
                  key={tagFilter}
                  label={tagFilter}
                  leadingIcon={
                    isSelected ? (
                      <AppIcon
                        color={colors.accentOnTint}
                        name="tag-outline"
                        size={TAG_CHIP_ICON_SIZE}
                      />
                    ) : undefined
                  }
                  onPress={() => {
                    onToggleTagFilter(tagFilter);
                  }}
                  variant={isSelected ? 'tag' : 'passive'}
                >
                  {isSelected ? (
                    <AppIcon
                      color={colors.accentOnTint}
                      name="close"
                      size={TAG_CHIP_ICON_SIZE}
                    />
                  ) : null}
                </InteractionChip>
              );
            })}
          </View>
        </View>
      ),
    });
  }

  sections.push({ key: 'sort', node: <LibrarySearchSortBlock {...props} /> });

  return (
    <View style={styles.filterPopover}>
      {sections.map((section, index) => {
        return (
          <Fragment key={section.key}>
            {index > 0 ? <FadedRule /> : null}
            {section.node}
          </Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  filterGroup: { gap: space.xs },
  filterLabel: {
    ...appTheme.type.kicker,
    color: colors.textMuted,
  },
  filterLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterPopover: {
    ...appTheme.elevation.flat,
    gap: space.md,
    padding: space.lg,
    borderRadius: appTheme.radius.md,
    backgroundColor: colors.surface,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  sectionColumn: { gap: space.md },
});
