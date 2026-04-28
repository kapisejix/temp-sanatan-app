/**
 * useApiData — fetches with API + falls back to mock if error/loading.
 * Returns: { data, loading, error, refetch }.
 */
import { useEffect, useState, useCallback, useRef } from 'react';

export default function useApiData(fetcher, fallbackData = null, deps = []) {
  const [data, setData] = useState(fallbackData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const mountedRef = useRef(true);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      if (mountedRef.current) {
        setData(res);
        setUsingFallback(false);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e?.message || 'API error');
        if (fallbackData !== null) {
          setData(fallbackData);
          setUsingFallback(true);
        }
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    run();
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, usingFallback, refetch: run };
}
