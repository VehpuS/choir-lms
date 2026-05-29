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

export const resolveOptionsMenuSheetActions = (
  actions: OptionsMenuAction[],
): ResolvedOptionsMenuAction[] => {
  return actions.map((action) => {
    return {
      ...action,
      tone: action.tone ?? 'secondary',
    };
  });
};
