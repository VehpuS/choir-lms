import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { PracticeToolsMenu } from './practice-tools-menu';
import { usePracticeTools, type PracticeTools } from './use-practice-tools';

export type PracticeToolsTriggerProps = {
  accessibilityLabel: string;
  isActive: boolean;
  isExpanded: boolean;
  onPress: () => void;
};

type PracticeToolsControlProps = {
  /** Draws the surface's own button; the control supplies state and press. */
  renderTrigger: (props: PracticeToolsTriggerProps) => ReactNode;
  /** Where the menu opens against the trigger. */
  menuPlacement: ViewStyle;
  /** Lets a flex row (the tab bar) give the anchor a share of its width. */
  anchorStyle?: ViewStyle;
  /** The viewer adds the other-octave row; every other surface omits it. */
  isSheetMusicOpen?: boolean;
  /**
   * Tools state held by the caller, so the menu can be drawn elsewhere (the
   * viewer's scrolling rail would clip it). Omit to let the control own it.
   */
  tools?: PracticeTools;
  /** False when the caller draws the menu itself. */
  showMenu?: boolean;
};

/**
 * The one Practice tools control (design Decision 11) shared by the tab bar,
 * the playback screen, and the sheet music viewer. Absent when the platform
 * offers no tool.
 */
export const PracticeToolsControl = ({
  renderTrigger,
  menuPlacement,
  anchorStyle,
  isSheetMusicOpen = false,
  tools: providedTools,
  showMenu = true,
}: PracticeToolsControlProps) => {
  const ownTools = usePracticeTools({ isSheetMusicOpen });
  const tools = providedTools ?? ownTools;

  if (!tools.model.isVisible) {
    return null;
  }

  return (
    <View
      style={[
        styles.anchor,
        anchorStyle,
        tools.isMenuOpen ? styles.anchorOpen : null,
      ]}
    >
      {renderTrigger({
        accessibilityLabel: tools.model.triggerLabel,
        isActive: tools.model.isActive,
        isExpanded: tools.isMenuOpen,
        onPress: tools.toggleMenu,
      })}
      {showMenu && tools.isMenuOpen ? (
        <PracticeToolsMenu
          model={tools.model}
          onClose={tools.closeMenu}
          onToggle={tools.toggleTool}
          placement={menuPlacement}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  anchor: { position: 'relative' },
  // Every view is its own stacking layer on web, so an open menu lifts its
  // whole anchor above the content it overlaps.
  anchorOpen: { zIndex: 40 },
});
