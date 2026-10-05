import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { OutlinedActionButton } from '../../components/outlined-action-button';
import { OptionsMenuSheet } from '../components/options-menu-sheet';
import { appTheme } from '../../utils/theme';
import {
  resolveBulkActionPress,
  splitBulkActions,
  type BulkAction,
} from './bulk-action-model';

const OVERFLOW_ICON_SIZE = 20;

export type BulkActionBarProps = {
  actions: readonly BulkAction[];
  /** Names the selection in the overflow sheet's heading, e.g. `3 selected`. */
  overflowTitle: string;
};

// The pinned footer of a selection (screen 1h's footer anatomy): up to three
// outlined actions on one row, an overflow button for the rest, and a status
// line that explains a disabled action when it is chosen.
export const BulkActionBar = ({
  actions,
  overflowTitle,
}: BulkActionBarProps) => {
  const [isOverflowVisible, setIsOverflowVisible] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const { overflow, visible } = splitBulkActions(actions);

  const press = (action: BulkAction) => {
    const outcome = resolveBulkActionPress(action);

    if (outcome.kind === 'explain') {
      setExplanation(outcome.message);

      return;
    }

    setExplanation(null);
    action.onPress();
  };

  return (
    <View style={styles.bar}>
      {explanation ? (
        <Text accessibilityLiveRegion="polite" style={styles.explanation}>
          {explanation}
        </Text>
      ) : null}
      <View style={styles.row}>
        {visible.map((action) => (
          <OutlinedActionButton
            fill
            icon={action.icon}
            key={action.id}
            label={action.label}
            onPress={() => {
              press(action);
            }}
            style={[styles.action, action.isDisabled ? styles.dimmed : null]}
            variant={action.tone}
          />
        ))}
        {overflow.length > 0 ? (
          <Pressable
            accessibilityLabel="More actions"
            accessibilityRole="button"
            onPress={() => {
              setIsOverflowVisible(true);
            }}
            style={({ pressed }) => [
              styles.overflowButton,
              pressed ? styles.dimmed : null,
            ]}
          >
            <AppIcon
              color={appTheme.colors.text}
              name="dots-vertical"
              size={OVERFLOW_ICON_SIZE}
            />
          </Pressable>
        ) : null}
      </View>
      <OptionsMenuSheet
        actions={overflow.map((action) => ({
          id: action.id,
          label: action.label,
          onPress: () => {
            setIsOverflowVisible(false);
            press(action);
          },
          tone: action.tone === 'destructive' ? 'destructive' : 'secondary',
        }))}
        isVisible={isOverflowVisible}
        onClose={() => {
          setIsOverflowVisible(false);
        }}
        title={overflowTitle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  action: {
    // Three labels share the row, so the roomy default padding is dropped.
    paddingHorizontal: appTheme.space.xs,
  },
  bar: {
    gap: appTheme.space.xs,
    paddingTop: appTheme.space.sm,
    paddingHorizontal: appTheme.space.screenInset,
    paddingBottom: appTheme.space.md,
    borderTopWidth: 1,
    borderTopColor: appTheme.colors.borderSubtle,
    backgroundColor: appTheme.colors.surfaceRaised,
  },
  // A disabled action looks inactive but stays pressable so it can explain.
  dimmed: {
    opacity: 0.56,
  },
  explanation: {
    color: appTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  overflowButton: {
    width: appTheme.space.touchTarget,
    height: appTheme.space.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.borderButton,
    borderRadius: appTheme.radius.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.xs,
  },
});
