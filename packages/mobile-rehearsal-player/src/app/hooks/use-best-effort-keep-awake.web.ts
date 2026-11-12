import { useScreenWakeLock } from '../components/wake-lock/use-screen-wake-lock';
import type { useBestEffortKeepAwake as UseBestEffortKeepAwake } from './use-best-effort-keep-awake';

/**
 * Keeps the screen on while the calling component is mounted. On the web this
 * goes through the shared wake-lock coordinator rather than `expo-keep-awake`,
 * which takes one lock per tag and does not ask again after the page has been
 * hidden (the browser drops the lock then), so a score left open would go dark
 * after a tab switch or a screen lock. The tag only separates holders on
 * native; the coordinator counts holders itself, so it is not needed here.
 */
export const useBestEffortKeepAwake: typeof UseBestEffortKeepAwake = () => {
  useScreenWakeLock(true);
};
