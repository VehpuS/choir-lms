import type { RehearsalLibraryFolderNode } from '@org/audio-library-models';
import {
  resolveRehearsalLibraryTagMatches,
  type RehearsalLibraryEntityCollections,
} from '@org/audio-library-runtime';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DriveSessionMenu } from '../../../../auth/google-drive/components/drive-session-menu';
import type { DriveSessionMenuController } from '../../../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import { DestinationHeader } from '../../../../components/destination-header';
import { getDestinationHeaderModel } from '../../../../components/destination-header-model';
import { appTheme } from '../../../../utils/theme';
import { ExplorerNavigationBar } from '../../../components/explorer';
import { TagMatchList } from '../tag-match-list';
import {
  DEFAULT_TAG_MATCH_LIST_SORT_STATE,
  type TagMatchListSortState,
} from '../tag-match-list/model';

const TAG_DETAIL_EYEBROW = 'Tag';

type TagDetailScreenProps = {
  authorization: DriveSessionMenuController;
  entityCollections: RehearsalLibraryEntityCollections;
  folders: RehearsalLibraryFolderNode[];
  onClose: () => void;
  tag: string;
};

export const TagDetailScreen = ({
  authorization,
  entityCollections,
  folders,
  onClose,
  tag,
}: TagDetailScreenProps) => {
  const [isSessionMenuVisible, setIsSessionMenuVisible] = useState(false);
  const [sortState, setSortState] = useState<TagMatchListSortState>(
    DEFAULT_TAG_MATCH_LIST_SORT_STATE,
  );
  const matches = useMemo(() => {
    return resolveRehearsalLibraryTagMatches(tag, { entityCollections, folders });
  }, [tag, entityCollections, folders]);
  const headerModel = getDestinationHeaderModel('library');

  return (
    <View style={styles.surface}>
      {isSessionMenuVisible ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setIsSessionMenuVisible(false);
          }}
          style={styles.menuBackdrop}
        />
      ) : null}
      <DestinationHeader
        style={styles.destinationHeader}
        title={headerModel.title}
        trailingAction={
          <DriveSessionMenu
            authState={authorization.authState}
            canClearAuthorization={authorization.canClearAuthorization}
            canStartAuthorization={authorization.canStartAuthorization}
            isBusy={authorization.isBusy}
            isVisible={isSessionMenuVisible}
            onClearAuthorization={() => {
              setIsSessionMenuVisible(false);
              void authorization.clearAuthorization();
            }}
            onStartAuthorization={() => {
              setIsSessionMenuVisible(false);
              void authorization.startAuthorization();
            }}
            onToggleVisibility={() => {
              setIsSessionMenuVisible((currentValue) => !currentValue);
            }}
            requestReady={authorization.requestReady}
            statusCopy={authorization.statusCopy}
          />
        }
      />
      <ExplorerNavigationBar
        canGoBack
        eyebrow={TAG_DETAIL_EYEBROW}
        onGoBack={onClose}
        title={tag}
      />
      <View style={styles.body}>
        <TagMatchList
          matches={matches}
          onChangeSortState={setSortState}
          sortState={sortState}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    gap: 12,
    backgroundColor: appTheme.colors.pageBackground,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  destinationHeader: {
    marginTop: 12,
  },
  body: {
    flex: 1,
  },
});
