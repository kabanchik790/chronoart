import { useEffect, useRef } from 'react';

type UsePollingOptions = {
  interval: number;
  enabled: boolean;
  fn: () => void | Promise<void>;
};

export function usePolling({ interval, enabled, fn }: UsePollingOptions) {
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      void fnRef.current();
    }, interval);

    return () => {
      window.clearInterval(timerId);
    };
  }, [enabled, interval]);
}
