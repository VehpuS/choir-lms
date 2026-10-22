import { DRIVE_ROOT_LABELS, type DriveBrowseLocation } from '@org/google-drive';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { darkScrollbarStyle } from '../../../components/dark-scrollbar';
import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  FOLDER_PICKER_EMPTY_MESSAGE,
  FOLDER_PICKER_NOTE,
  FOLDER_PICKER_SHARED_ROOT_MESSAGE,
  FOLDER_PICKER_TITLE,
  SAVE_HERE_LABEL,
  canSaveHere,
  resolveSaveTarget,
} from './folder-mode-model';
import {
  DRIVE_PICKER_FAILURE_COPY,
  DRIVE_PICKER_ROOTS,
  canGoUpInDrivePicker,
  describeDrivePickerLocation,
  type DrivePickerNavigation,
} from './model';
import {
  useDriveSheetMusicPicker,
  type DriveSheetMusicClient,
} from './use-drive-sheet-music-picker';

type DriveFolderPickerSheetProps = {
  accessToken: string | undefined;
  client?: DriveSheetMusicClient;
  initialNavigation: DrivePickerNavigation;
  onChoose: (target: {
    folderId: string;
    folderName: string;
    navigation: DrivePickerNavigation;
  }) => void;
  onClose: () => void;
  onReconnectDrive: () => void;
};

const LIST_MAX_HEIGHT_SHARE = 0.4;

/**
 * Chooses the Drive folder a file is saved into: only folders are listed, and
 * `Save here` saves into the folder being shown. Reuses the sheet music
 * picker's browsing, so it opens where the caller says and goes up the same way.
 */
export const DriveFolderPickerSheet = ({
  accessToken,
  client,
  initialNavigation,
  onChoose,
  onClose,
  onReconnectDrive,
}: DriveFolderPickerSheetProps) => {
  const picker = useDriveSheetMusicPicker({
    accessToken,
    client,
    initialNavigation,
  });
  const { height } = useWindowDimensions();
  const { state } = picker;
  const target = resolveSaveTarget(picker.navigation);
  const isSelectedRoot = (root: DriveBrowseLocation) => {
    return picker.navigation.stack[0]?.rootKind === root.rootKind;
  };

  return (
    <BottomSheetSurface
      eyebrow="Save to Drive"
      isVisible={true}
      onClose={onClose}
      title={FOLDER_PICKER_TITLE}
    >
      <View style={styles.stack}>
        <View style={styles.row}>
          {DRIVE_PICKER_ROOTS.map((root) => (
            <OutlinedActionButton
              fill
              key={root.id}
              label={DRIVE_ROOT_LABELS[root.rootKind]}
              onPress={() => picker.switchRoot(root)}
              selected={isSelectedRoot(root)}
              variant={isSelectedRoot(root) ? 'accent' : 'neutral'}
            />
          ))}
        </View>
        <View style={styles.row}>
          <Text numberOfLines={2} style={styles.location}>
            {describeDrivePickerLocation(picker.navigation)}
          </Text>
          {canGoUpInDrivePicker(picker.navigation) ? (
            <OutlinedActionButton
              icon="chevron-left"
              label="Up"
              onPress={picker.goUp}
            />
          ) : null}
        </View>
        {!canSaveHere(picker.navigation) ? (
          <Text style={styles.copy}>{FOLDER_PICKER_SHARED_ROOT_MESSAGE}</Text>
        ) : null}

        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={[
            darkScrollbarStyle,
            { maxHeight: height * LIST_MAX_HEIGHT_SHARE },
          ]}
        >
          {state.status === 'loading' ? (
            <Text style={styles.copy}>Loading…</Text>
          ) : null}
          {state.status === 'failed' ? (
            <View style={styles.stack}>
              <Text style={styles.copy}>
                {DRIVE_PICKER_FAILURE_COPY[state.reason]}
              </Text>
              <OutlinedActionButton
                label={
                  state.reason === 'needs-drive-access'
                    ? 'Reconnect Drive'
                    : 'Try again'
                }
                onPress={
                  state.reason === 'needs-drive-access'
                    ? onReconnectDrive
                    : picker.retry
                }
                variant="accent"
              />
            </View>
          ) : null}
          {state.status === 'ready' ? (
            <>
              {state.listing.folders.map((folder) => (
                <Pressable
                  accessibilityLabel={`Open folder ${folder.name}`}
                  accessibilityRole="button"
                  key={folder.id}
                  onPress={() => picker.openFolder(folder)}
                  style={styles.item}
                >
                  <AppIcon
                    color={appTheme.colors.textMuted}
                    name="folder-outline"
                    size={20}
                  />
                  <Text numberOfLines={1} style={styles.itemName}>
                    {folder.name}
                  </Text>
                </Pressable>
              ))}
              {state.isLoadingMore ? (
                <Text style={styles.copy}>Loading more…</Text>
              ) : null}
              {!state.isLoadingMore && state.listing.folders.length === 0 ? (
                <Text style={styles.copy}>{FOLDER_PICKER_EMPTY_MESSAGE}</Text>
              ) : null}
            </>
          ) : null}
        </ScrollView>

        <Text style={styles.copy}>{FOLDER_PICKER_NOTE}</Text>
        <View style={styles.row}>
          <OutlinedActionButton label="Back" onPress={onClose} />
          <OutlinedActionButton
            accessibilityLabel={SAVE_HERE_LABEL}
            disabled={!target}
            label={SAVE_HERE_LABEL}
            onPress={() => {
              if (target) {
                onChoose({ ...target, navigation: picker.navigation });
              }
            }}
            variant="accent"
          />
        </View>
      </View>
    </BottomSheetSurface>
  );
};

const styles = StyleSheet.create({
  copy: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
    lineHeight: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.sm,
    minHeight: appTheme.space.touchTarget,
    paddingVertical: appTheme.space.xs,
  },
  itemName: {
    ...appTheme.type.body,
    flex: 1,
    color: appTheme.colors.text,
  },
  location: {
    ...appTheme.type.body,
    flex: 1,
    color: appTheme.colors.text,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.xs,
  },
  stack: {
    gap: appTheme.space.sm,
  },
});
