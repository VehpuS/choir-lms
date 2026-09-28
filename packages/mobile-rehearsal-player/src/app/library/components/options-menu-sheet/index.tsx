import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheetSurface } from '../bottom-sheet-surface';
import { MenuGroup, MenuRow } from './menu-group';
import type { MenuRowTone } from './menu-group-model';
import { splitIntoMenuGroups } from './menu-group-model';
import {
  resolveOptionsMenuSheetActions,
  resolveOptionsMenuSheetHeading,
  resolveOptionsMenuSheetSectionDividers,
  type OptionsMenuAction,
  type ResolvedOptionsMenuAction,
} from './model';

import { appTheme } from '../../../utils/theme';

type OptionsMenuSheetProps = {
  actions: OptionsMenuAction[];
  children?: ReactNode;
  isVisible: boolean;
  title: string;
  secondaryActionLabel?: string;
  onClose: () => void;
  onSecondaryAction?: () => void;
  isSecondaryDisabled?: boolean;
};

const ACTION_TONE_TO_ROW_TONE: Record<
  ResolvedOptionsMenuAction['tone'],
  MenuRowTone
> = {
  destructive: 'destructive',
  primary: 'preferred',
  secondary: 'default',
};

// An iOS action sheet inside the app's bottom sheet: each menu section is
// its own rounded group, and Cancel sits alone in a group below.
export const OptionsMenuSheet = ({
  actions,
  children,
  isVisible,
  title,
  secondaryActionLabel = 'Cancel',
  onClose,
  onSecondaryAction,
  isSecondaryDisabled = false,
}: OptionsMenuSheetProps) => {
  if (!isVisible) {
    return null;
  }

  const resolvedActions = resolveOptionsMenuSheetActions(actions);
  const heading = resolveOptionsMenuSheetHeading(title);
  const actionGroups = splitIntoMenuGroups(
    resolvedActions,
    resolveOptionsMenuSheetSectionDividers(resolvedActions),
  );

  return (
    <BottomSheetSurface
      eyebrow={heading.eyebrow}
      isVisible
      onClose={onClose}
      title={heading.title}
    >
      <View style={styles.contentColumn}>
        {children ? <View>{children}</View> : null}
        {actionGroups.map((group) => {
          return (
            <MenuGroup key={group[0]?.id}>
              {group.map((action) => {
                return (
                  <MenuRow
                    disabled={action.disabled}
                    key={action.id}
                    label={action.label}
                    onPress={action.onPress}
                    tone={ACTION_TONE_TO_ROW_TONE[action.tone]}
                  />
                );
              })}
            </MenuGroup>
          );
        })}
        <MenuGroup>
          <MenuRow
            disabled={isSecondaryDisabled}
            label={secondaryActionLabel}
            onPress={onSecondaryAction ?? onClose}
            tone="cancel"
          />
        </MenuGroup>
      </View>
    </BottomSheetSurface>
  );
};

const styles = StyleSheet.create({
  contentColumn: {
    gap: appTheme.space.xs,
  },
});
