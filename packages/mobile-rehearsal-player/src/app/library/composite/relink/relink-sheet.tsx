import { useState } from 'react';
import { StyleSheet, TextInput, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  MenuGroup,
  MenuRow,
} from '../../components/options-menu-sheet/menu-group';
import {
  RELINK_CANCEL_LABEL,
  RELINK_EMPTY_MESSAGE,
  RELINK_SEARCH_LABEL,
  RELINK_SHEET_TITLE,
  type RelinkOption,
} from './relink-model';

const { colors, space, radius, type } = appTheme;

type RelinkSheetProps = {
  /** Called with what was typed; returns the matching tracks. */
  getOptions: (query: string) => RelinkOption[];
  stemName: string;
  onCancel: () => void;
  onChoose: (trackId: string) => void;
};

/** A searchable list of the library tracks a missing stem can point at. */
export const RelinkSheet = ({
  getOptions,
  onCancel,
  onChoose,
  stemName,
}: RelinkSheetProps) => {
  const [query, setQuery] = useState('');
  const options = getOptions(query);

  return (
    <BottomSheetSurface
      footer={
        <MenuGroup>
          <MenuRow label={RELINK_CANCEL_LABEL} onPress={onCancel} />
        </MenuGroup>
      }
      isVisible={true}
      onClose={onCancel}
      scrollable={true}
      title={`${RELINK_SHEET_TITLE}: ${stemName}`}
    >
      <View style={styles.body}>
        <TextInput
          accessibilityLabel={RELINK_SEARCH_LABEL}
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder={RELINK_SEARCH_LABEL}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          value={query}
        />
        {options.length === 0 ? (
          <Text style={styles.empty}>{RELINK_EMPTY_MESSAGE}</Text>
        ) : (
          <MenuGroup>
            {options.map((option) => (
              <MenuRow
                accessibilityLabel={`Re-link to ${option.name}`}
                align="leading"
                key={option.trackId}
                label={option.name}
                onPress={() => onChoose(option.trackId)}
              />
            ))}
          </MenuGroup>
        )}
      </View>
    </BottomSheetSurface>
  );
};

const styles = StyleSheet.create({
  body: { gap: space.md },
  empty: { ...type.rowMeta, color: colors.textMuted },
  input: {
    minHeight: space.touchTarget,
    borderWidth: 1,
    borderColor: colors.borderChip,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    color: colors.text,
    fontSize: type.input.fontSize,
    backgroundColor: colors.surface,
  },
});
