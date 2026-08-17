import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RehearsalLibraryTagUsage } from '@org/audio-library-runtime';
import { join, map, toUpper } from 'es-toolkit/compat';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useState } from 'react';
import { runtimeConfig } from '../../../config/runtime';
import { DriveSessionMenu } from '../../auth/google-drive/components/drive-session-menu';
import type { DriveSessionMenuController } from '../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import { CompactPlayableRowShell } from '../../components/compact-playable-row-shell';
import { CompactPlaybackAction } from '../../components/compact-playback-action';
import { DestinationHeader } from '../../components/destination-header';
import { getDestinationHeaderModel } from '../../components/destination-header-model';
import { SurfaceIconButton } from '../../components/surface-icon-button';
import { InteractionChip } from '../../library/components/interaction-chip';
import { OptionsMenuSheet } from '../../library/components/options-menu-sheet';
import { appTheme } from '../../utils/theme';
import {
  getRecentRehearsalLastPlayedLabel,
  type RecentRehearsalItem,
} from './history';
import { getRecentsOverflowActionState } from './overflow-actions';
import {
  RECENTS_SHORTCUT_TAG_CAP,
  getRecentsContinuePracticingCopy,
  getRecentsTagModuleCopy,
  getRecentsTagModuleVisibility,
} from './screen-copy';
import { recentsScreenStyles as styles } from './styles';

export type RecentsScreenProps = {
  activePlayableItemId: string | null;
  authorization: DriveSessionMenuController;
  canQueueAsNext: boolean;
  isPlaybackActive: boolean;
  isRecentItemInLibrary: (recentRehearsal: RecentRehearsalItem) => boolean;
  libraryTagUsage: RehearsalLibraryTagUsage[];
  recentRehearsalHistory: RecentRehearsalItem[];
  onQueueRecentPlaybackNext: (recentRehearsal: RecentRehearsalItem) => void;
  onQueueRecentPlaybackUpNext: (recentRehearsal: RecentRehearsalItem) => void;
  onResumeRecentPlayback: (recentRehearsal: RecentRehearsalItem) => void;
  onSelectRecentShortcutTag: (shortcutTag: string) => void;
  onViewAllTags: () => void;
  onViewRecentInLibrary: (recentRehearsal: RecentRehearsalItem) => void;
  savedTrackCount: number;
};

const AUDIO_FORMAT_LABEL = join(
  map(runtimeConfig.supportedAudioExtensions, (extension) =>
    toUpper(extension),
  ),
  ', ',
);

export const RecentsScreen = ({
  activePlayableItemId,
  authorization,
  canQueueAsNext,
  isPlaybackActive,
  isRecentItemInLibrary,
  libraryTagUsage,
  recentRehearsalHistory,
  onQueueRecentPlaybackNext,
  onQueueRecentPlaybackUpNext,
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
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.resumeCard}>
          <Text style={styles.resumeCardTitle}>
            {continuePracticingCopy.title}
          </Text>
          {continuePracticingCopy.body ? (
            <Text style={styles.resumeCardBody}>
              {continuePracticingCopy.body}
            </Text>
          ) : null}
          {recentRehearsalHistory.map((recentRehearsal) => {
            const isCurrentRowPlaying =
              isPlaybackActive &&
              recentRehearsal.playableItem.id === activePlayableItemId;

            return (
              <View key={recentRehearsal.id}>
                <CompactPlayableRowShell
                  actions={
                    <CompactPlaybackAction
                      accessibilityLabel={`Play ${recentRehearsal.title}`}
                      disabled={isCurrentRowPlaying}
                      disabledIconColor={appTheme.colors.secondaryText}
                      iconName="play"
                      onPress={() => {
                        onResumeRecentPlayback(recentRehearsal);
                      }}
                      variant="row"
                    />
                  }
                  metadata={
                    <Text numberOfLines={1} style={styles.recentItemMeta}>
                      {getRecentRehearsalLastPlayedLabel(
                        recentRehearsal.playedAt,
                      )}
                    </Text>
                  }
                  overflowTrigger={
                    <Pressable
                      accessibilityLabel={`More actions for ${recentRehearsal.title}`}
                      accessibilityRole="button"
                      onPress={() => {
                        setActiveOptionsRecentId(recentRehearsal.id);
                      }}
                      style={({ pressed }) => [
                        styles.iconActionButton,
                        pressed ? styles.iconActionButtonPressed : undefined,
                      ]}
                    >
                      <MaterialCommunityIcons
                        color={appTheme.colors.primaryText}
                        name="dots-vertical"
                        size={20}
                      />
                    </Pressable>
                  }
                  style={styles.recentItemRow}
                  title={
                    <Text numberOfLines={1} style={styles.recentItemTitle}>
                      {recentRehearsal.title}
                    </Text>
                  }
                  variant="row"
                />
                <OptionsMenuSheet
                  actions={getRecentsOverflowActionState({
                    canQueueAsNext,
                    isViewInLibraryAvailable:
                      isRecentItemInLibrary(recentRehearsal),
                  }).map((action) => {
                    if (action.id === 'play-next') {
                      return {
                        ...action,
                        onPress: () => {
                          setActiveOptionsRecentId(null);
                          onQueueRecentPlaybackNext(recentRehearsal);
                        },
                      };
                    }

                    if (action.id === 'add-to-queue') {
                      return {
                        ...action,
                        onPress: () => {
                          setActiveOptionsRecentId(null);
                          onQueueRecentPlaybackUpNext(recentRehearsal);
                        },
                      };
                    }

                    return {
                      ...action,
                      onPress: () => {
                        setActiveOptionsRecentId(null);
                        onViewRecentInLibrary(recentRehearsal);
                      },
                    };
                  })}
                  isVisible={activeOptionsRecentId === recentRehearsal.id}
                  onClose={() => {
                    setActiveOptionsRecentId(null);
                  }}
                  title={recentRehearsal.title}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.shortcutsCard}>
          <View style={styles.shortcutsHeader}>
            <View style={styles.shortcutsCopy}>
              <Text style={styles.shortcutsTitle}>Popular tags</Text>
              {tagModuleVisibility.showGuidanceBody ? (
                <Text style={styles.shortcutsBody}>{tagModuleCopy.body}</Text>
              ) : null}
            </View>
            {tagModuleVisibility.showOverflowTrigger ? (
              <SurfaceIconButton
                accessibilityLabel="See all tags"
                icon="chevron-right"
                onPress={onViewAllTags}
                size={20}
              />
            ) : null}
          </View>
          {hasSavedTagUsage && !isRecentPlaybackAvailable ? (
            <Text style={styles.shortcutsMeta}>{shortcutMetadata}</Text>
          ) : null}
          {hasSavedTagUsage ? (
            <View style={styles.tagRow}>
              {shortcutTags.map((tag) => (
                <InteractionChip
                  accessibilityLabel={`Open ${tag} tag`}
                  key={tag}
                  label={tag}
                  labelStyle={styles.tagLabel}
                  onPress={() => {
                    onSelectRecentShortcutTag(tag);
                  }}
                  style={styles.tagChip}
                  variant="passive"
                />
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
};
