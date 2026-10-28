import { Fragment } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { ariaStateProps } from '../../components/aria-state';
import { useEscapeToDismiss } from '../../components/escape-to-dismiss/use-escape-to-dismiss';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../components/interaction-guard';
import { appTheme } from '../../utils/theme';
import type {
  PracticeToolId,
  PracticeToolsModel,
} from './practice-tools-model';

type PracticeToolsMenuProps = {
  model: PracticeToolsModel;
  onClose: () => void;
  onToggle: (id: PracticeToolId) => void;
  /** Where the panel sits against the control that opened it. */
  placement?: ViewStyle;
};

const { colors, space } = appTheme;
const ICON_SIZE = 20;
const ROW_MIN_HEIGHT = 48;
const PANEL_WIDTH = 268;
// Only the web build offers tools today, and react-native-web accepts fixed
// positioning; the scrim must cover the viewport, not just the anchor's box.
const VIEWPORT_SCRIM = { position: 'fixed' } as unknown as ViewStyle;

/**
 * The floating Practice tools menu (design Decision 11): a switch per tool
 * that toggles without closing, so both tools can be turned on in one visit.
 * It closes on a press outside or Escape (Android back on native).
 */
export const PracticeToolsMenu = ({
  model,
  onClose,
  onToggle,
  placement,
}: PracticeToolsMenuProps) => {
  useEscapeToDismiss(true, onClose);

  return (
    <>
      <Pressable
        accessibilityLabel="Close practice tools"
        accessibilityRole="button"
        onPress={onClose}
        style={[styles.scrim, VIEWPORT_SCRIM]}
      />
      <View style={[styles.panel, placement]}>
        <Text style={styles.title}>{model.menuTitle}</Text>
        {model.rows.map((row) => (
          <Fragment key={row.id}>
            {row.startsGroup ? <View style={styles.divider} /> : null}
            <Pressable
              accessibilityHint={row.description}
              accessibilityLabel={row.accessibilityLabel}
              accessibilityRole="switch"
              accessibilityState={{ checked: row.checked }}
              {...ariaStateProps({ checked: row.checked }, 'switch')}
              {...interactionGuardProps}
              onPress={() => onToggle(row.id)}
              style={({ pressed }) => [
                styles.row,
                buttonInteractionGuardStyle,
                pressed ? styles.rowPressed : null,
              ]}
            >
              <AppIcon
                color={row.checked ? colors.accentText : colors.textMuted}
                name={row.icon}
                size={ICON_SIZE}
              />
              <View style={styles.rowText}>
                <Text
                  style={[
                    styles.rowLabel,
                    row.checked ? styles.rowLabelOn : null,
                  ]}
                >
                  {row.label}
                </Text>
                {row.description ? (
                  <Text style={styles.rowDescription}>{row.description}</Text>
                ) : null}
              </View>
              <View style={[styles.track, row.checked ? styles.trackOn : null]}>
                <View
                  style={[styles.thumb, row.checked ? styles.thumbOn : null]}
                />
              </View>
            </Pressable>
          </Fragment>
        ))}
      </View>
    </>
  );
};

const TRACK_WIDTH = 36;
const TRACK_HEIGHT = 20;
const THUMB_SIZE = 16;
const THUMB_INSET = 2;

const styles = StyleSheet.create({
  scrim: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 29,
  },
  panel: {
    position: 'absolute',
    zIndex: 30,
    width: PANEL_WIDTH,
    paddingVertical: space.xs,
    paddingHorizontal: space.xxs,
    borderRadius: appTheme.radius.lg,
    backgroundColor: colors.surface,
    ...appTheme.elevation.raised,
  },
  title: {
    ...appTheme.type.kicker,
    marginHorizontal: space.md,
    marginTop: space.xs,
    color: colors.textMuted,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    minHeight: ROW_MIN_HEIGHT,
    paddingHorizontal: space.md,
    borderRadius: appTheme.radius.md,
  },
  rowPressed: { backgroundColor: colors.bg },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: space.xs,
    marginHorizontal: space.md,
    backgroundColor: colors.divider,
  },
  rowText: { flex: 1, paddingVertical: space.xs },
  rowDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  rowLabel: {
    color: colors.text,
    fontSize: 15,
  },
  rowLabelOn: { color: colors.accentText },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    justifyContent: 'center',
    borderRadius: appTheme.radius.pill,
    backgroundColor: colors.divider,
  },
  trackOn: { backgroundColor: colors.surfaceAccent },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    marginLeft: THUMB_INSET,
    borderRadius: appTheme.radius.pill,
    backgroundColor: colors.textMuted,
  },
  thumbOn: {
    marginLeft: TRACK_WIDTH - THUMB_SIZE - THUMB_INSET,
    backgroundColor: colors.accentText,
  },
});
