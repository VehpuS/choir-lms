import type { ReactNode } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { ChipRow } from './chip-row';
import { ChipDivider } from './part-chips';

type ViewerLayoutProps = {
  /** The score, with anything laid over it. */
  body: ReactNode;
  closeButton: ReactNode;
  /** A phone held sideways: the controls move to a slim rail beside the score. */
  isCompact: boolean;
  /** Why the shown parts are not what was asked for, when they are not. */
  notices: ReactNode;
  onClose: () => void;
  ownerName: string;
  partChips: ReactNode;
  sourceChips: ReactNode;
  sourceLabel: string | undefined;
  toolbar: (orientation: 'column' | 'row') => ReactNode;
};

/**
 * Where the viewer's pieces sit. A phone held sideways is too short for a
 * header, two chip rows, and a toolbar above the score, so below a height limit
 * the controls move into a rail beside the score and the chips share one row.
 */
export const ViewerLayout = ({
  body,
  closeButton,
  isCompact,
  notices,
  onClose,
  ownerName,
  partChips,
  sourceChips,
  sourceLabel,
  toolbar,
}: ViewerLayoutProps) => {
  if (isCompact) {
    return (
      <Modal animationType="slide" onRequestClose={onClose} visible>
        <View style={[styles.screen, styles.screenCompact]}>
          <View style={styles.compactMain}>
            {sourceChips || partChips ? (
              <ChipRow accessibilityLabel="Sources and parts">
                {sourceChips}
                {sourceChips && partChips ? <ChipDivider /> : null}
                {partChips}
              </ChipRow>
            ) : sourceLabel ? (
              <Text numberOfLines={1} style={styles.subtitle}>
                {`${ownerName} · ${sourceLabel}`}
              </Text>
            ) : null}
            {notices}
            <View style={styles.body}>{body}</View>
          </View>
          <View style={styles.rail}>
            {closeButton}
            {toolbar('column')}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.titles}>
            <Text numberOfLines={1} style={styles.title}>
              {ownerName}
            </Text>
            {sourceLabel ? (
              <Text numberOfLines={1} style={styles.subtitle}>
                {sourceLabel}
              </Text>
            ) : null}
          </View>
          {closeButton}
        </View>
        {sourceChips ? (
          <ChipRow accessibilityLabel="Sheet music sources">
            {sourceChips}
          </ChipRow>
        ) : null}
        {partChips ? (
          <ChipRow accessibilityLabel="Parts">{partChips}</ChipRow>
        ) : null}
        {notices}
        <View style={styles.body}>{body}</View>
        {toolbar('row')}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  compactMain: {
    flex: 1,
    gap: appTheme.space.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: appTheme.space.md,
  },
  rail: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screen: {
    flex: 1,
    gap: appTheme.space.md,
    paddingHorizontal: appTheme.space.screenInset,
    paddingVertical: appTheme.space.lg,
    backgroundColor: appTheme.colors.bg,
  },
  screenCompact: {
    flexDirection: 'row',
    paddingVertical: appTheme.space.sm,
  },
  subtitle: {
    ...appTheme.type.rowMeta,
    color: appTheme.colors.textMuted,
  },
  title: {
    ...appTheme.type.rowTitle,
    color: appTheme.colors.text,
  },
  titles: {
    flex: 1,
  },
});
