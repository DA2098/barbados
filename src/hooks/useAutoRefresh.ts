import { useEffect, useRef } from 'react';

type RefreshOptions = {
  intervalMs?: number;
  enabled?: boolean;
};

export function useAutoRefresh(callback: () => void | Promise<void>, options: RefreshOptions = {}) {
  const { intervalMs = 30000, enabled = true } = options;
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const run = () => {
      if (!mounted) return;
      void callbackRef.current();
    };

    run();

    const intervalId = window.setInterval(run, intervalMs);
    const handleFocus = () => run();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        run();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, intervalMs]);
}