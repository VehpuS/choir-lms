import type { SheetMusicSource } from '@org/audio-library-models';
import { ScrollView, StyleSheet } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { InteractionChip } from '../../components/interaction-chip';

type SourceSwitcherProps = {
  onSelect: (sourceId: string) => void;
  selectedId: string;
  sources: readonly SheetMusicSource[];
};

/** Moves between a track's sources, for example `Full score` and `Alto part`. */
export const SourceSwitcher = ({
  onSelect,
  selectedId,
  sources,
}: SourceSwitcherProps) => {
  return (
    <ScrollView
      accessibilityLabel="Sheet music sources"
      contentContainerStyle={styles.row}
      horizontal
      style={styles.scroller}
      showsHorizontalScrollIndicator={false}
    >
      {sources.map((source) => {
        const isSelected = source.id === selectedId;

        return (
          <InteractionChip
            accessibilityLabel={`Show ${source.label}`}
            accessibilitySelected={isSelected}
            key={source.id}
            label={source.label}
            onPress={() => onSelect(source.id)}
            variant={isSelected ? 'selected' : 'passive'}
          />
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  // A horizontal ScrollView grows to fill a column; keep it to its chips' height.
  scroller: {
    flexGrow: 0,
  },
  row: {
    gap: appTheme.space.sm,
  },
});
