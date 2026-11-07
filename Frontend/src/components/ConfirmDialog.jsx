import { useEffect, useRef } from 'react';
import { Button } from './ui';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = false, loading = false, onConfirm, onCancel, children }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape' && !loading) onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !loading) onCancel(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
        <h2 id="dlg-title">{title}</h2>
        {message && <p className="dialog-text">{message}</p>}
        {children}
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
