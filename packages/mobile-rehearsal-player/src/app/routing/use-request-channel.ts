import { useCallback, useState } from 'react';

export type RequestChannelState<Value> = {
  /** Increments on every request so repeating the same value still re-fires. */
  requestId: number;
  value: Value;
};

export const advanceRequestChannel = <Value>(
  current: RequestChannelState<Value>,
  value: Value,
): RequestChannelState<Value> => {
  return { requestId: current.requestId + 1, value };
};

/**
 * A "please show X" request from one part of the app to another. Receivers
 * react to `requestId` changing, so asking for the same value twice (say, the
 * same tag) still reaches them.
 */
export const useRequestChannel = <Value>(initialValue: Value) => {
  const [state, setState] = useState<RequestChannelState<Value>>({
    requestId: 0,
    value: initialValue,
  });
  const request = useCallback((value: Value) => {
    setState((current) => advanceRequestChannel(current, value));
  }, []);

  return { request, requestId: state.requestId, value: state.value };
};

/** A request that carries no value, such as "close the open detail". */
export const useRequestSignal = () => {
  const { request, requestId } = useRequestChannel<null>(null);
  const signal = useCallback(() => {
    request(null);
  }, [request]);

  return { requestId, signal };
};
