import { usePianoSampleWarmup } from './library/piano/use-piano-sample-warmup';
import { AppRouter } from './routing/app-router';

export const App = () => {
  // The piano's recordings are fetched in the background from the start, so
  // the first key is not waiting on a download (a fresh launch has no cache).
  usePianoSampleWarmup();

  return <AppRouter />;
};

export default App;
