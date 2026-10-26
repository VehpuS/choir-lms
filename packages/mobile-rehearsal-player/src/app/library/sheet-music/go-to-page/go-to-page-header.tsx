import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import { pageRangeHint, parsePageNumber } from './go-to-page-model';

export const GO_TO_PAGE_FIELD_LABEL = 'Page number';

type GoToPageHeaderProps = {
  /** The page being read (0-based); the field starts on it. */
  currentPage: number;
  /** Called with the 0-based page when the field holds a valid page number. */
  onGo: (page: number) => void;
  pageCount: number;
};

/**
 * The sheet's fixed header: a page number field, the range it accepts, and
 * `Go`. It sits above the grid so the soft keyboard never covers it, and `Go`
 * stays off until the number is a page of this document.
 */
export const GoToPageHeader = ({
  currentPage,
  onGo,
  pageCount,
}: GoToPageHeaderProps) => {
  const [draft, setDraft] = useState(String(currentPage + 1));
  const target = parsePageNumber(draft, pageCount);

  const submit = () => {
    if (target !== undefined) {
      onGo(target);
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={GO_TO_PAGE_FIELD_LABEL}
          autoCorrect={false}
          inputMode="numeric"
          keyboardType="number-pad"
          onChangeText={setDraft}
          onSubmitEditing={submit}
          returnKeyType="go"
          selectTextOnFocus
          style={styles.field}
          value={draft}
        />
        <OutlinedActionButton
          accessibilityLabel="Go"
          disabled={target === undefined}
          label="Go"
          onPress={submit}
          variant="accent"
        />
      </View>
      <Text style={styles.hint}>{`Pages ${pageRangeHint(pageCount)}`}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    flex: 1,
    minHeight: appTheme.space.touchTarget,
    borderWidth: 1,
    borderColor: appTheme.colors.borderChip,
    borderRadius: appTheme.radius.md,
    paddingHorizontal: appTheme.space.md,
    color: appTheme.colors.text,
    fontSize: appTheme.type.input.fontSize,
    backgroundColor: appTheme.colors.surface,
  },
  header: {
    gap: appTheme.space.xxs,
  },
  hint: {
    ...appTheme.type.rowMeta,
    color: appTheme.colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.xs,
  },
});
