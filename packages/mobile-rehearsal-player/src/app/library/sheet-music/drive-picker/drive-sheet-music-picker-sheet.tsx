import type { SheetMusicSource } from '@org/audio-library-models';
import type {
  DriveBrowseLocation,
  DriveSheetMusicFile,
} from '@org/google-drive';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  describeAlreadyAdded,
  findDuplicateSheetMusic,
} from '../manager/model';
import {
  DRIVE_EMPTY_FOLDER_MESSAGE,
  DRIVE_EMPTY_SEARCH_MESSAGE,
  DRIVE_MORE_RESULTS_MESSAGE,
  DRIVE_PICKER_FAILURE_COPY,
  DRIVE_PICKER_NOTE,
  DRIVE_PICKER_ROOTS,
  canGoUpInDrivePicker,
  describeDrivePickerResultsLine,
  getDrivePickerSearchFolderName,
  describeDrivePickerLocation,
} from './model';
import { SHEET_MUSIC_FORMAT_LABELS } from '../format-labels';
import { DrivePickerSearchBar } from './drive-picker-search-bar';
import {
  useDriveSheetMusicPicker,
  type DriveSheetMusicClient,
} from './use-drive-sheet-music-picker';
import { darkScrollbarStyle } from '../../../components/dark-scrollbar';

type DriveSheetMusicPickerSheetProps = {
  /** The track's sources, so a file it already has is refused. */
  existingSources: readonly SheetMusicSource[];
  /** The current Drive token, or undefined when Drive is not connected. */
  accessToken: string | undefined;
  client?: DriveSheetMusicClient;
  onClose: () => void;
  onPick: (file: DriveSheetMusicFile) => void;
  onReconnectDrive: () => void;
};

const LIST_MAX_HEIGHT_SHARE = 0.4;
/**
 * Chooses a sheet music file from Google Drive: My Drive or shared folders,
 * folder by folder, or a search by name. Files the app cannot use are hidden,
 * and the sheet says so.
 */
export const DriveSheetMusicPickerSheet = ({
  existingSources,
  accessToken,
  client,
  onClose,
  onPick,
  onReconnectDrive,
}: DriveSheetMusicPickerSheetProps) => {
  const picker = useDriveSheetMusicPicker({ accessToken, client });
  const [draftQuery, setDraftQuery] = useState('');
  const [refusal, setRefusal] = useState<string | null>(null);
  const { height } = useWindowDimensions();
  const { state } = picker;
  const isSearching = picker.query.length > 0;
  const isSelectedRoot = (root: DriveBrowseLocation) => {
    return (
      !isSearching && picker.navigation.stack[0]?.rootKind === root.rootKind
    );
  };

  return (
    <BottomSheetSurface
      eyebrow="Sheet music"
      isVisible={true}
      onClose={onClose}
      title="Choose from Google Drive"
    >
      <View style={styles.stack}>
        <View style={styles.row}>
          {DRIVE_PICKER_ROOTS.map((root) => (
            <OutlinedActionButton
              fill
              key={root.id}
              label={
                root.rootKind === 'shared' ? 'Shared with you' : 'My Drive'
              }
              onPress={() => {
                setDraftQuery('');
                picker.switchRoot(root);
              }}
              selected={isSelectedRoot(root)}
              variant={isSelectedRoot(root) ? 'accent' : 'neutral'}
            />
          ))}
        </View>
        <DrivePickerSearchBar
          draftQuery={draftQuery}
          folderName={getDrivePickerSearchFolderName(picker.navigation)}
          onChangeDraft={(text) => {
            setDraftQuery(text);

            if (text.trim().length === 0) {
              picker.search('');
            }
          }}
          onChooseScope={picker.setSearchScope}
          onSubmit={picker.search}
          scope={picker.searchScope}
        />

        <View style={styles.locationRow}>
          <Text numberOfLines={2} style={styles.location}>
            {isSearching
              ? describeDrivePickerResultsLine(
                  picker.query,
                  picker.searchScope,
                  getDrivePickerSearchFolderName(picker.navigation),
                )
              : describeDrivePickerLocation(picker.navigation)}
          </Text>
          {!isSearching && canGoUpInDrivePicker(picker.navigation) ? (
            <OutlinedActionButton
              icon="chevron-left"
              label="Up"
              onPress={picker.goUp}
            />
          ) : null}
        </View>

        {refusal ? <Text style={styles.copy}>{refusal}</Text> : null}

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
                  onPress={() => {
                    setDraftQuery('');
                    picker.openFolder(folder);
                  }}
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
              {state.listing.files.map((file) => (
                <Pressable
                  accessibilityLabel={`Add ${file.name}`}
                  accessibilityRole="button"
                  key={file.id}
                  onPress={() => {
                    const duplicate = findDuplicateSheetMusic(existingSources, {
                      fileId: file.id,
                      kind: 'drive',
                      name: file.name,
                    });

                    setRefusal(
                      duplicate ? describeAlreadyAdded(duplicate) : null,
                    );

                    if (!duplicate) {
                      onPick(file);
                    }
                  }}
                  style={styles.item}
                >
                  <AppIcon
                    color={appTheme.colors.textMuted}
                    name="sheet-music-outline"
                    size={20}
                  />
                  <Text numberOfLines={2} style={styles.itemName}>
                    {file.name}
                  </Text>
                  <Text style={styles.itemFormat}>
                    {SHEET_MUSIC_FORMAT_LABELS[file.format]}
                  </Text>
                </Pressable>
              ))}
              {state.isLoadingMore ? (
                <Text style={styles.copy}>
                  {isSearching ? 'Still searching…' : 'Loading more…'}
                </Text>
              ) : null}
              {state.listing.hasMore ? (
                <Text style={styles.copy}>{DRIVE_MORE_RESULTS_MESSAGE}</Text>
              ) : null}
              {!state.isLoadingMore &&
              state.listing.folders.length === 0 &&
              state.listing.files.length === 0 ? (
                <Text style={styles.copy}>
                  {isSearching
                    ? DRIVE_EMPTY_SEARCH_MESSAGE
                    : DRIVE_EMPTY_FOLDER_MESSAGE}
                </Text>
              ) : null}
            </>
          ) : null}
        </ScrollView>

        <Text style={styles.copy}>{DRIVE_PICKER_NOTE}</Text>
        <OutlinedActionButton label="Back" onPress={onClose} />
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
  itemFormat: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.sm,
  },
  row: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
  },
  stack: {
    gap: appTheme.space.sm,
  },
});
