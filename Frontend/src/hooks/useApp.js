import { useContext, useEffect } from 'react';
import { AuthContext, ToastContext, FavoritesContext } from '../context/contexts';

export const useAuth = () => useContext(AuthContext);
export const useToast = () => useContext(ToastContext);
export const useFavorites = () => useContext(FavoritesContext);

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · StudentHub` : 'StudentHub — Student Freelancing Marketplace';
  }, [title]);
}
