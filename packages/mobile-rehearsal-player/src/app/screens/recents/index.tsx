import { MaterialCommunityIcons } from '@expo/vector-icons';
import { join, map, toUpper } from 'es-toolkit/compat';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useState } from 'react';
import { runtimeConfig } from '../../../config/runtime';
import { CompactPlaybackAction } from '../../components/compact-playback-action';
import { CompactPlayableRowShell } from '../../components/compact-playable-row-shell';
import { InteractionChip } from '../../library/components/interaction-chip';
import { OptionsMenuSheet } from '../../library/components/options-menu-sheet';
import { appTheme } from '../../utils/theme';
import {
  getRecentRehearsalLastPlayedLabel,
  type RecentRehearsalItem,
} from './history';
import { getRecentsOverflowActionState } from './overflow-actions';
import {
  getRecentsContinuePracticingCopy,
  getRecentsShortcutPlayActionCopy,
} from './screen-copy';
import { recentsScreenStyles as styles } from './styles';

export type RecentsScreenProps = {
  activePlayableItemId: string | null;
  canQueueAsNext: boolean;
  isPlaybackActive: boolean;
  isRecentItemInLibrary: (recentRehearsal: RecentRehearsalItem) => boolean;
  recentRehearsalHistory: RecentRehearsalItem[];
  onQueueRecentPlaybackNext: (recentRehearsal: RecentRehearsalItem) => void;
  onQueueRecentPlaybackUpNext: (recentRehearsal: RecentRehearsalItem) => void;
  onPlayRecentShortcut: (shortcutTag: string) => void;
  onResumeRecentPlayback: (recentRehearsal: RecentRehearsalItem) => void;
  onViewRecentInLibrary: (recentRehearsal: RecentRehearsalItem) => void;
  savedTrackCount: number;
};

const RECENTS_SHORTCUT_TAGS = ['Soprano', 'Alto', 'Tenor', 'Bass', 'Warmup'];

const AUDIO_FORMAT_LABEL = join(
  map(runtimeConfig.supportedAudioExtensions, (extension) =>
    toUpper(extension),
  ),
  ', ',
);

export const RecentsScreen = ({
  activePlayableItemId,
  canQueueAsNext,
  isPlaybackActive,
  isRecentItemInLibrary,
  recentRehearsalHistory,
  onQueueRecentPlaybackNext,
  onQueueRecentPlaybackUpNext,
  onPlayRecentShortcut,
  onResumeRecentPlayback,
  onViewRecentInLibrary,
  savedTrackCount,
}: RecentsScreenProps) => {
  const [activeOptionsRecentId, setActiveOptionsRecentId] = useState<
    string | null
  >(null);
  const latestRecentRehearsal = recentRehearsalHistory[0] ?? null;
  const continuePracticingCopy = getRecentsContinuePracticingCopy({
    activePlayableItemTitle: latestRecentRehearsal?.title ?? null,
    savedTrackCount,
  });
  const isRecentPlaybackAvailable = latestRecentRehearsal !== null;

  const shortcutMetadata = `${RECENTS_SHORTCUT_TAGS.length} optional shortcut tags`;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <View style={styles.hero}>
        <Text style={styles.title}>Resume your latest practice</Text>
        <Text style={styles.subtitle}>Jump back into practice here.</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Saved tracks</Text>
          <Text style={styles.statusValue}>{savedTrackCount}</Text>
        </View>
        <Text style={styles.statusValueList}>{AUDIO_FORMAT_LABEL}</Text>
      </View>

      <View style={styles.resumeCard}>
        <Text style={styles.resumeCardTitle}>
          {continuePracticingCopy.title}
        </Text>
        <Text style={styles.resumeCardBody}>{continuePracticingCopy.body}</Text>
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
            <Text style={styles.shortcutsTitle}>Popular shortcuts</Text>
            <Text style={styles.shortcutsBody}>
              Optional tag shortcuts for fast recents scanning.
            </Text>
          </View>
        </View>
        <Text style={styles.shortcutsMeta}>{shortcutMetadata}</Text>
        <View style={styles.tagRow}>
          {RECENTS_SHORTCUT_TAGS.map((tag) => (
            <InteractionChip
              key={tag}
              label={tag}
              labelStyle={styles.tagLabel}
              style={styles.tagChip}
              variant="passive"
            >
              <CompactPlaybackAction
                accessibilityLabel={
                  getRecentsShortcutPlayActionCopy({
                    isResumePlaybackAvailable: isRecentPlaybackAvailable,
                    shortcutTag: tag,
                  }).accessibilityLabel
                }
                disabled={!isRecentPlaybackAvailable}
                disabledIconColor={appTheme.colors.secondaryText}
                iconName="play"
                onPress={() => {
                  onPlayRecentShortcut(tag);
                }}
                variant="chip"
              />
            </InteractionChip>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};
