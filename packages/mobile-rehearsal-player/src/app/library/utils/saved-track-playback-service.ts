import {
  dispatchSavedTrackPlaybackRemoteCommand,
  type SavedTrackPlaybackRemoteCommand,
} from './saved-track-playback-remote-controls';

type SavedTrackPlaybackServiceSubscription = {
  remove: () => void;
};

type TrackPlayerModule = typeof import('react-native-track-player');
type TrackPlayerEventName =
  TrackPlayerModule['Event'][keyof TrackPlayerModule['Event']];

type SavedTrackPlaybackServicePlayer = {
  addEventListener: (
    eventName: TrackPlayerEventName,
    handler: () => Promise<void> | void,
  ) => SavedTrackPlaybackServiceSubscription;
};

type SavedTrackPlaybackServiceDependencies = {
  dispatchRemoteCommand?: (
    command: SavedTrackPlaybackRemoteCommand,
  ) => Promise<boolean>;
  player?: SavedTrackPlaybackServicePlayer;
  remoteEvents?: Record<SavedTrackPlaybackRemoteCommand, TrackPlayerEventName>;
};

const REMOTE_COMMANDS: readonly SavedTrackPlaybackRemoteCommand[] = [
  'play',
  'pause',
  'next',
  'previous',
];

const getTrackPlayerModule = () => {
  return require('react-native-track-player') as TrackPlayerModule;
};

const getDefaultSavedTrackPlaybackServicePlayer = () => {
  return getTrackPlayerModule().default;
};

const getSavedTrackPlaybackRemoteEvents = () => {
  const { Event } = getTrackPlayerModule();

  return {
    play: Event.RemotePlay,
    pause: Event.RemotePause,
    next: Event.RemoteNext,
    previous: Event.RemotePrevious,
  } satisfies Record<SavedTrackPlaybackRemoteCommand, TrackPlayerEventName>;
};

export const registerSavedTrackPlaybackRemoteEventListeners = (
  dependencies: SavedTrackPlaybackServiceDependencies = {},
) => {
  const dispatchRemoteCommand =
    dependencies.dispatchRemoteCommand ??
    ((command: SavedTrackPlaybackRemoteCommand) =>
      dispatchSavedTrackPlaybackRemoteCommand(command));
  const player =
    dependencies.player ?? getDefaultSavedTrackPlaybackServicePlayer();
  const remoteEvents =
    dependencies.remoteEvents ?? getSavedTrackPlaybackRemoteEvents();
  const subscriptions = REMOTE_COMMANDS.map((command) => {
    return player.addEventListener(remoteEvents[command], async () => {
      await dispatchRemoteCommand(command);
    });
  });

  return () => {
    subscriptions.forEach((subscription) => {
      subscription.remove();
    });
  };
};

export const savedTrackPlaybackService = async () => {
  registerSavedTrackPlaybackRemoteEventListeners();
};
