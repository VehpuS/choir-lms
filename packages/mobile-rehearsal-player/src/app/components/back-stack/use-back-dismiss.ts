type UseBackDismiss = (isActive: boolean, onDismiss: () => void) => void;

// Native already closes layers on the Android back button (`BackHandler`, in
// `useEscapeToDismiss`, and the Modal's own `onRequestClose`), and iOS has no
// back gesture to handle, so there is nothing to register. The web version is
// `use-back-dismiss.web.ts`.
export const useBackDismiss: UseBackDismiss = () => undefined;
