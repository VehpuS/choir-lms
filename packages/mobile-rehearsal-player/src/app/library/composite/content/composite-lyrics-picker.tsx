import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { InteractionChip } from '../../components/interaction-chip';
import {
  describeStemsWithoutLyrics,
  type CompositeLyricsInfo,
} from './composite-lyrics-model';

type CompositeLyricsPickerProps = {
  info: CompositeLyricsInfo;
  onSelect: (stemId: string) => void;
};

/**
 * One chip per stem to pick whose lyrics to show, or, with no lyrics yet, which
 * stem `Add` saves them on. Nothing renders when there is only one choice.
 */
export const CompositeLyricsPicker = ({
  info,
  onSelect,
}: CompositeLyricsPickerProps) => {
  if (!info.showPicker) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {info.isChoosingWhereToAdd ? 'Add lyrics to' : 'Lyrics from'}
      </Text>
      <View style={styles.chips}>
        {info.choices.map((choice) => (
          <InteractionChip
            accessibilityLabel={`${info.isChoosingWhereToAdd ? 'Add lyrics to' : 'Show lyrics of'} ${choice.name}`}
            accessibilitySelected={choice.id === info.selectedStemId}
            key={choice.id}
            label={choice.name}
            onPress={() => onSelect(choice.id)}
            variant={choice.id === info.selectedStemId ? 'selected' : 'passive'}
          />
        ))}
      </View>
      {info.withoutLyricsNames.length > 0 ? (
        <Text style={styles.note}>
          {describeStemsWithoutLyrics(info.withoutLyricsNames)}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appTheme.space.xs,
  },
  container: {
    gap: appTheme.space.xs,
  },
  label: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
  },
  note: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
  },
});
