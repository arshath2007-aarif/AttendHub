import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

// Loads data from the API. Pass `interval` (ms) to poll, e.g. live attendance.
export default function useFetch(url, { interval = 0, enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!url || !enabled) return;
    try {
      const res = await api.get(url);
      setData(res.data);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => {
    setLoading(true);
    load();
    if (!interval) return;
    const t = setInterval(load, interval);
    return () => clearInterval(t);
  }, [load, interval]);

  return { data, loading, error, reload: load };
}
