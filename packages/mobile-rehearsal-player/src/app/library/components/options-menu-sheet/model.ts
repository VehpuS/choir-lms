export type OptionsMenuAction = {
  disabled?: boolean;
  id: string;
  label: string;
  onPress: () => void;
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
