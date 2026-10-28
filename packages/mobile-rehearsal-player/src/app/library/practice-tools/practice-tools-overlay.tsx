import type { ViewStyle } from 'react-native';

import { PracticeToolsMenu } from './practice-tools-menu';
import type { PracticeTools } from './use-practice-tools';

/**
 * The menu drawn by a screen that holds the tools state itself, for when the
 * trigger sits somewhere that would clip it (a scrolling rail).
 */
export const practiceToolsOverlay = (
  tools: PracticeTools,
  placement: ViewStyle,
) => {
  if (!tools.isMenuOpen) {
    return null;
  }

  return (
    <PracticeToolsMenu
      model={tools.model}
      onClose={tools.closeMenu}
      onToggle={tools.toggleTool}
      placement={placement}
    />
  );
};
