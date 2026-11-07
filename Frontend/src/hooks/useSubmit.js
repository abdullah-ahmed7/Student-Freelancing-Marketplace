import { useCallback, useRef, useState } from 'react';

// Wraps an async submit handler: blocks duplicate submissions and tracks the pending state.
export function useSubmit(handler) {
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const submit = useCallback(async (...args) => {
    if (lock.current) return undefined;
    lock.current = true;
    setPending(true);
    try {
      return await handler(...args);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }, [handler]);
  return [submit, pending];
}
