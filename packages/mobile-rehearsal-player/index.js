import { registerRootComponent } from 'expo';

import App from './src/app/App';
import { savedTrackPlaybackService } from './src/app/library/playback/utils/saved-track-playback-service';
import { registerSavedTrackPlayerPlaybackService } from './src/app/library/playback/utils/saved-track-player-interop';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
registerSavedTrackPlayerPlaybackService(savedTrackPlaybackService);
