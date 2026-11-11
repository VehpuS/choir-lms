import type { ViewStyle } from 'react-native';

/**
 * Lets the bottom dock's background reach the screen edges while its content
 * stays inside the safe areas. Native iOS and Android pad the shell themselves
 * (and the app is portrait-locked there), so this adds nothing; the web
 * version is `dock-bleed.web.ts`.
 */
export const dockBleedStyle: ViewStyle = {};
