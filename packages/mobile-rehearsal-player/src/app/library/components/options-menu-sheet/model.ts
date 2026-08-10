export type OptionsMenuAction = {
  disabled?: boolean;
  id: string;
  label: string;
  onPress: () => void;
  /**
   * Optional grouping key for long menus. Actions sharing a section render
   * together; a visual divider appears where the section changes. Actions
   * without a section (the common case for short menus) render as one
   * unbroken list.
   */
  section?: string;
  tone?: 'destructive' | 'primary' | 'secondary';
};

export type ResolvedOptionsMenuAction = Omit<OptionsMenuAction, 'tone'> & {
  tone: 'destructive' | 'primary' | 'secondary';
};

export const resolveOptionsMenuSheetHeading = (title: string) => {
  return {
    eyebrow: undefined,
    title,
  };
};

export const resolveOptionsMenuSheetActions = (
  actions: OptionsMenuAction[],
): ResolvedOptionsMenuAction[] => {
  const resolvedActions = actions.map((action) => {
    return {
      ...action,
      tone: action.tone ?? 'secondary',
    };
  });

  return [
    ...resolvedActions.filter((action) => {
      return action.tone === 'primary';
    }),
    ...resolvedActions.filter((action) => {
      return action.tone === 'secondary';
    }),
    ...resolvedActions.filter((action) => {
      return action.tone === 'destructive';
    }),
  ];
};

/**
 * Marks the actions that should render a leading section divider: the
 * first action whose declared `section` differs from the previous action's
 * section. Actions without a `section` never trigger a divider, so
 * short/unsectioned menus keep rendering as one unbroken list.
 */
export const resolveOptionsMenuSheetSectionDividers = (
  actions: ResolvedOptionsMenuAction[],
): boolean[] => {
  return actions.map((action, index) => {
    if (index === 0 || action.section === undefined) {
      return false;
    }

    return action.section !== actions[index - 1]?.section;
  });
};
