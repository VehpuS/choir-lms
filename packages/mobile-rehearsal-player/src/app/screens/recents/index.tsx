import type { RehearsalLibraryTagUsage } from '@org/audio-library-runtime';
import { join, map, toUpper } from 'es-toolkit/compat';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useState } from 'react';
import { AppIcon } from '../../components/app-icon';
import { runtimeConfig } from '../../../config/runtime';
import { DriveSessionMenu } from '../../auth/google-drive/components/drive-session-menu';
import type { DriveSessionMenuController } from '../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import { DestinationHeader } from '../../components/destination-header';
import { getDestinationHeaderModel } from '../../components/destination-header-model';
import { FadedRule } from '../../components/faded-rule';
import { InteractionChip } from '../../library/components/interaction-chip';
import { appTheme } from '../../utils/theme';
import type {
  RecentPlaylistRehearsalItem,
  RecentRehearsalItem,
} from './history';

import { RecentPlaylistMenu } from './recent-playlist-menu';
import { RecentRehearsalMenu } from './recent-rehearsal-menu';
import { RecentRehearsalRow } from './recent-rehearsal-row';
import { getRecentItemCountLabel, isRecentRowPlaying } from './row-model';
import {
  RECENTS_SHORTCUT_TAG_CAP,
  getRecentsContinuePracticingCopy,
  getRecentsTagModuleCopy,
  getRecentsTagModuleVisibility,
} from './screen-copy';
import { recentsScreenStyles as styles } from './styles';
import { scrollGutterStyles } from '../../components/scroll-gutter';

export type RecentsScreenProps = {
  activePlaylistId: string | null;
  activePlayableItemId: string | null;
  authorization: DriveSessionMenuController;
  canQueueAsNext: boolean;
  isPlaybackActive: boolean;
  isRecentItemInLibrary: (recentRehearsal: RecentRehearsalItem) => boolean;
  libraryTagUsage: RehearsalLibraryTagUsage[];
  recentRehearsalHistory: RecentRehearsalItem[];
  onQueueRecentPlaybackNext: (recentRehearsal: RecentRehearsalItem) => void;
  onQueueRecentPlaybackUpNext: (recentRehearsal: RecentRehearsalItem) => void;
  onQueueRecentPlaylist: (recentPlaylist: RecentPlaylistRehearsalItem) => void;
  onResumeRecentPlayback: (recentRehearsal: RecentRehearsalItem) => void;
  onSelectRecentShortcutTag: (shortcutTag: string) => void;
  onViewAllTags: () => void;
  onViewRecentInLibrary: (recentRehearsal: RecentRehearsalItem) => void;
  savedTrackCount: number;
};

const SEE_ALL_ICON_SIZE = 16;

const AUDIO_FORMAT_LABEL = join(
  map(runtimeConfig.supportedAudioExtensions, (extension) =>
    toUpper(extension),
  ),
  ', ',
);

export const RecentsScreen = ({
  activePlaylistId,
  activePlayableItemId,
  authorization,
  canQueueAsNext,
  isPlaybackActive,
  isRecentItemInLibrary,
  libraryTagUsage,
  recentRehearsalHistory,
  onQueueRecentPlaybackNext,
  onQueueRecentPlaybackUpNext,
  onQueueRecentPlaylist,
  onResumeRecentPlayback,
  onSelectRecentShortcutTag,
  onViewAllTags,
  onViewRecentInLibrary,
  savedTrackCount,
}: RecentsScreenProps) => {
  const [activeOptionsRecentId, setActiveOptionsRecentId] = useState<
    string | null
  >(null);
  const headerModel = getDestinationHeaderModel('recents');
  const [isSessionMenuVisible, setIsSessionMenuVisible] = useState(false);
  const latestRecentRehearsal = recentRehearsalHistory[0] ?? null;
  const continuePracticingCopy = getRecentsContinuePracticingCopy({
    activePlayableItemTitle: latestRecentRehearsal?.title ?? null,
    hasRecentHistory: recentRehearsalHistory.length > 0,
    savedTrackCount,
  });
  const isRecentPlaybackAvailable = latestRecentRehearsal !== null;
  const hasSavedTagUsage = libraryTagUsage.length > 0;
  const shortcutTags = libraryTagUsage
    .slice(0, RECENTS_SHORTCUT_TAG_CAP)
    .map((tagUsage) => tagUsage.tag);
  const tagModuleCopy = getRecentsTagModuleCopy({ hasSavedTagUsage });
  const tagModuleVisibility = getRecentsTagModuleVisibility({
    hasSavedTagUsage,
    isRecentPlaybackAvailable,
    libraryTagUsageCount: libraryTagUsage.length,
  });

  const shortcutMetadata = `${shortcutTags.length} optional shortcut tags - ${AUDIO_FORMAT_LABEL}`;

  return (
    <View style={styles.screen}>
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
            statusCopy={authorization.statusCopy}
          />
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, scrollGutterStyles.content]}
        showsVerticalScrollIndicator={false}
        style={[styles.scrollView, scrollGutterStyles.scrollView]}
      >
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>
            {continuePracticingCopy.title}
          </Text>
          {recentRehearsalHistory.length > 0 ? (
            <Text style={styles.sectionCount}>
              {getRecentItemCountLabel(recentRehearsalHistory.length)}
            </Text>
          ) : null}
        </View>
        {continuePracticingCopy.body ? (
          <Text style={styles.sectionBody}>{continuePracticingCopy.body}</Text>
        ) : null}
        <View>
          {recentRehearsalHistory.map((recentRehearsal, index) => (
            <View key={recentRehearsal.id}>
              <RecentRehearsalRow
                isLast={index === recentRehearsalHistory.length - 1}
                isPlaying={isRecentRowPlaying({
                  activePlayableItemId,
                  activePlaylistId,
                  isPlaybackActive,
                  recentRehearsal,
                })}
                onOpenOptions={() => {
                  setActiveOptionsRecentId(recentRehearsal.id);
                }}
                onPlay={() => {
                  onResumeRecentPlayback(recentRehearsal);
                }}
                recentRehearsal={recentRehearsal}
              />
              {recentRehearsal.kind === 'playlist' ? (
                <RecentPlaylistMenu
                  canQueueAsNext={canQueueAsNext}
                  isInLibrary={isRecentItemInLibrary(recentRehearsal)}
                  isVisible={activeOptionsRecentId === recentRehearsal.id}
                  onClose={() => {
                    setActiveOptionsRecentId(null);
                  }}
                  onQueuePlaylist={() => {
                    onQueueRecentPlaylist(recentRehearsal);
                  }}
                  onViewInLibrary={() => {
                    onViewRecentInLibrary(recentRehearsal);
                  }}
                  recentPlaylist={recentRehearsal}
                />
              ) : (
                <RecentRehearsalMenu
                  canQueueAsNext={canQueueAsNext}
                  isInLibrary={isRecentItemInLibrary(recentRehearsal)}
                  isVisible={activeOptionsRecentId === recentRehearsal.id}
                  onClose={() => {
                    setActiveOptionsRecentId(null);
                  }}
                  onQueueNext={() => {
                    onQueueRecentPlaybackNext(recentRehearsal);
                  }}
                  onQueueUpNext={() => {
                    onQueueRecentPlaybackUpNext(recentRehearsal);
                  }}
                  onViewInLibrary={() => {
                    onViewRecentInLibrary(recentRehearsal);
                  }}
                  recentRehearsal={recentRehearsal}
                />
              )}
            </View>
          ))}
        </View>

        <FadedRule style={styles.sectionRule} />

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Popular tags</Text>
          {tagModuleVisibility.showOverflowTrigger ? (
            <Pressable
              accessibilityLabel="See all tags"
              accessibilityRole="button"
              onPress={onViewAllTags}
              style={({ pressed }) => [
                styles.seeAllAction,
                pressed ? styles.seeAllActionPressed : null,
              ]}
            >
              <Text style={styles.seeAllLabel}>See all</Text>
              <AppIcon
                color={appTheme.colors.accentText}
                name="chevron-right"
                size={SEE_ALL_ICON_SIZE}
              />
            </Pressable>
          ) : null}
        </View>
        {tagModuleVisibility.showGuidanceBody ? (
          <Text style={styles.sectionBody}>{tagModuleCopy.body}</Text>
        ) : null}
        {hasSavedTagUsage && !isRecentPlaybackAvailable ? (
          <Text style={styles.sectionMeta}>{shortcutMetadata}</Text>
        ) : null}
        {hasSavedTagUsage ? (
          <View style={styles.tagRow}>
            {shortcutTags.map((tag) => (
              <InteractionChip
                accessibilityLabel={`Open ${tag} tag`}
                key={tag}
                label={tag}
                onPress={() => {
                  onSelectRecentShortcutTag(tag);
                }}
                variant="passive"
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};
