import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext, ToastContext, FavoritesContext } from './contexts';
import { authService, serviceService } from '../services';

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const showToast = useCallback((message, type = 'success') => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
            <span>{t.message}</span>
            <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore the session on load
  useEffect(() => {
    let off = false;
    authService.restore()
      .then((u) => { if (!off) setUser(u); })
      .catch(() => {})
      .finally(() => { if (!off) setReady(true); });
    return () => { off = true; };
  }, []);

  const login = useCallback(async (creds) => { const u = await authService.login(creds); setUser(u); return u; }, []);
  const register = useCallback(async (f) => { const u = await authService.register(f); setUser(u); return u; }, []);
  const verify = useCallback(async (code) => { const u = await authService.verify(code); setUser(u); return u; }, []);
  const logout = useCallback(async () => { await authService.logout(); setUser(null); }, []);

  const value = useMemo(
    () => ({ user, ready, isAdmin: user?.role === 'admin', login, register, verify, logout, setUser }),
    [user, ready, login, register, verify, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function FavoritesProvider({ children }) {
  const user = useContext(AuthContext)?.user?.id || null;
  const [state, setState] = useState({ userId: null, ids: [] });

  useEffect(() => {
    if (!user) return undefined;
    let off = false;
    serviceService.favoriteIds().then((ids) => { if (!off) setState({ userId: user, ids }); }).catch(() => {});
    return () => { off = true; };
  }, [user]);

  const toggle = useCallback(async (serviceId) => {
    const res = await serviceService.toggleFavorite(serviceId);
    setState((s) => ({
      userId: user,
      ids: res.saved ? [...new Set([...s.ids, serviceId])] : s.ids.filter((x) => x !== serviceId),
    }));
    return res.saved;
  }, [user]);

  const value = useMemo(() => ({ ids: state.userId === user ? state.ids : [], toggle }), [state, user, toggle]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}
