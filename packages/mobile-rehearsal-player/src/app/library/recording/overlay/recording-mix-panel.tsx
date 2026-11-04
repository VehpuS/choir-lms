import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { buttonInteractionGuardStyle } from '../../../components/interaction-guard';
import { appTheme } from '../../../utils/theme';
import { RecordingBalanceControl } from './recording-balance-control';
import { getMixSummary, MIX_PANEL_TITLE } from './recording-mix-panel-model';
import {
  readMixPanelOpen,
  saveMixPanelOpen,
} from './recording-mix-panel-storage';
import { useRecordingMixState } from './recording-mix-store';
import { RecordingSyncControl } from './recording-sync-control';
import { useRecordingSyncState } from './recording-sync-store';

const { colors, space, type } = appTheme;
const CHEVRON_SIZE = 18;

/**
 * Balance, level and sync under one row (rehearsal-recording tasks 14.16 and
 * 14.18): closed it is a single line with a summary, open it shows the
 * controls. The last state is remembered on this device. The controls stay
 * mounted while it is closed, so a nudge that is still being saved is not lost.
 */
export const RecordingMixPanel = () => {
  const [isOpen, setIsOpen] = useState(true);
  const { balance, levelDb } = useRecordingMixState();
  const { nudgeMs } = useRecordingSyncState();

  useEffect(() => {
    let isCurrent = true;

    void readMixPanelOpen().then((stored) => {
      if (isCurrent) {
        setIsOpen(stored);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  const toggle = () => {
    const next = !isOpen;

    setIsOpen(next);
    void saveMixPanelOpen(next);
  };

  return (
    <View>
      <Pressable
        accessibilityLabel={MIX_PANEL_TITLE}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        aria-expanded={isOpen}
        onPress={toggle}
        style={({ pressed }) => [
          styles.header,
          buttonInteractionGuardStyle,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text style={styles.title}>{MIX_PANEL_TITLE}</Text>
        {isOpen ? (
          <View style={styles.spacer} />
        ) : (
          <Text numberOfLines={1} style={styles.summary}>
            {getMixSummary({ balance, levelDb, nudgeMs })}
          </Text>
        )}
        <AppIcon
          color={colors.textMuted}
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={CHEVRON_SIZE}
        />
      </Pressable>
      <View style={isOpen ? null : styles.hidden}>
        <RecordingBalanceControl />
        <RecordingSyncControl />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    minHeight: space.touchTarget,
  },
  hidden: { display: 'none' },
  pressed: { opacity: 0.7 },
  spacer: { flex: 1 },
  summary: {
    ...type.rowMeta,
    color: colors.textMuted,
    flex: 1,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  title: { ...type.rowTitle, color: colors.text },
});
