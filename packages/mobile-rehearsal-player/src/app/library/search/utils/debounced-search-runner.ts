import debounce from 'lodash.debounce';

type CreateDebouncedSearchRunnerOptions = {
  debounceMs: number;
  maxWaitMs?: number;
  runSearch: (query: string) => void;
};

type DebouncedSearchRunner = {
  cancel: () => void;
  flush: (query: string) => void;
  schedule: (query: string) => void;
};

const DEFAULT_MAX_WAIT_MS = 500;

export const createDebouncedSearchRunner = ({
  debounceMs,
  maxWaitMs = DEFAULT_MAX_WAIT_MS,
  runSearch,
}: CreateDebouncedSearchRunnerOptions): DebouncedSearchRunner => {
  const debouncedRun = debounce(
    (query: string) => {
      runSearch(query);
    },
    debounceMs,
    {
      leading: false,
      maxWait: maxWaitMs,
      trailing: true,
    },
  );

  return {
    cancel() {
      debouncedRun.cancel();
    },
    flush(query: string) {
      debouncedRun.cancel();
      runSearch(query);
    },
    schedule(query: string) {
      debouncedRun(query);
    },
  };
};
