type UseEscapeToDismiss = (isActive: boolean, onDismiss: () => void) => void;

// Native has no hardware Escape key, so the menu closes through its trigger
// and scrim only. The web version lives in `use-escape-to-dismiss.web.ts`.
export const useEscapeToDismiss: UseEscapeToDismiss = () => undefined;
