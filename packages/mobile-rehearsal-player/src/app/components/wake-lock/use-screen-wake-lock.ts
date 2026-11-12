type UseScreenWakeLock = (isActive: boolean) => void;

// Native keeps the screen awake through the platform's own audio session and
// has no wake lock to ask for here; the web version is
// `use-screen-wake-lock.web.ts`.
export const useScreenWakeLock: UseScreenWakeLock = () => undefined;
