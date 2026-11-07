import { useCallback, useEffect, useRef, useState } from 'react';


export function useAsync(fn, key = '') {
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });

  const [tick, setTick] = useState(0);
  const [res, setRes] = useState({ id: null, data: null, error: null });
  const id = `${key}#${tick}`;

  useEffect(() => {
    let off = false;
    fnRef.current()
      .then((data) => { if (!off) setRes({ id, data, error: null }); })
      .catch((error) => { if (!off) setRes({ id, data: null, error }); });
    return () => { off = true; };
  }, [id]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const loading = res.id !== id;
  return { data: res.data, error: loading ? null : res.error, loading, reload };
}
