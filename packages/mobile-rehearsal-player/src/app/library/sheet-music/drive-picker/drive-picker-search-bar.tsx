import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { OverflowMenuTrigger } from '../../../components/overflow-menu-trigger';
import { appTheme } from '../../../utils/theme';
import { OptionsMenuSheet } from '../../components/options-menu-sheet';
import {
  describeDrivePickerSearchPlaceholder,
  type DrivePickerSearchScope,
} from './model';

type DrivePickerSearchBarProps = {
  draftQuery: string;
  /** The folder a folder search runs in; undefined at a root. */
  folderName: string | undefined;
  onChangeDraft: (text: string) => void;
  onChooseScope: (scope: DrivePickerSearchScope) => void;
  onSubmit: (text: string) => void;
  scope: DrivePickerSearchScope;
};

/**
 * The search field. Inside a folder an overflow menu beside it chooses where
 * the search runs: that folder and its subfolders, or all of Drive.
 */
export const DrivePickerSearchBar = ({
  draftQuery,
  folderName,
  onChangeDraft,
  onChooseScope,
  onSubmit,
  scope,
}: DrivePickerSearchBarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const placeholder = describeDrivePickerSearchPlaceholder(scope, folderName);
  const closeMenu = () => {
    setIsMenuOpen(false);
  };
  const chooseScope = (next: DrivePickerSearchScope) => {
    closeMenu();
    onChooseScope(next);
  };

  return (
    <View style={styles.row}>
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeDraft}
        onSubmitEditing={() => {
          onSubmit(draftQuery.trim());
        }}
        placeholder={placeholder}
        placeholderTextColor={appTheme.colors.textFaint}
        returnKeyType="search"
        style={styles.field}
        value={draftQuery}
      />
      {folderName ? (
        <>
          <OverflowMenuTrigger
            accessibilityLabel="Search options"
            onPress={() => {
              setIsMenuOpen(true);
            }}
            style={styles.trigger}
          />
          <OptionsMenuSheet
            actions={[
              {
                id: 'search-folder',
                label: `Search in ${folderName}`,
                onPress: () => {
                  chooseScope('folder');
                },
                tone: scope === 'folder' ? 'primary' : 'secondary',
              },
              {
                id: 'search-everywhere',
                label: 'Search all of Drive',
                onPress: () => {
                  chooseScope('everywhere');
                },
                tone: scope === 'everywhere' ? 'primary' : 'secondary',
              },
            ]}
            isVisible={isMenuOpen}
            onClose={closeMenu}
            title="Search where?"
          />
        </>
      ) : null}
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
    fontSize: 15,
    backgroundColor: appTheme.colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.xs,
  },
  // The shared trigger is absolutely placed by default; here it sits in the row.
  trigger: {
    position: 'relative',
    right: 0,
    top: 0,
  },
});
