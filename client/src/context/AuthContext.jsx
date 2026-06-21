import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const refreshAuth = async () => {
      console.log('[AuthContext] Refreshing auth state from /auth/me...');
      setLoading(true);
      try {
        const { user } = await api.getMe();
        if (isMounted) {
          setUser(user);
          console.log('[AuthContext] Auth refreshed successfully, user:', user?.name || 'LOGGED OUT');
        }
      } catch (err) {
        if (isMounted) {
          setUser(null);
          console.log('[AuthContext] Auth refresh failed (user logged out):', err.message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    refreshAuth();

    // Handle back/forward navigation with cached pages
    const handlePageShow = (event) => {
      console.log('[AuthContext] pageshow event fired, persisted:', event.persisted);
      // event.persisted = true means page was restored from bfcache (back/forward cache)
      if (event.persisted) {
        console.log('[AuthContext] Page restored from back-forward cache, refreshing auth...');
        refreshAuth();
      }
    };

    // Also listen for popstate (back/forward button in browser)
    const handlePopState = (event) => {
      console.log('[AuthContext] popstate event fired (back/forward button clicked)', 'state:', event.state);
      refreshAuth();
    };

    // Listen for hashchange (URL fragment changes)
    const handleHashChange = () => {
      console.log('[AuthContext] hashchange event fired');
      refreshAuth();
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    
    // Also refresh auth every time the window gets focus (user switches tabs/windows)
    const handleFocus = () => {
      console.log('[AuthContext] window focus event fired');
      refreshAuth();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      isMounted = false;
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { user } = await api.login({ email, password });
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (data) => {
    const result = await api.register(data);
    if (!result.needsVerification && result.user) {
      setUser(result.user);
    }
    return result;
  }, []);

  const requestProfileUpdate = useCallback(async (data) => {
    return api.requestProfileUpdate(data);
  }, []);

  const confirmProfileUpdate = useCallback(async (data) => {
    const { user } = await api.confirmProfileUpdate(data);
    setUser(user);
    return user;
  }, []);

  const addAddress = useCallback(async (data) => {
    const { user } = await api.createAddress(data);
    setUser(user);
    return user;
  }, []);

  const editAddress = useCallback(async (id, data) => {
    const { user } = await api.updateAddress(id, data);
    setUser(user);
    return user;
  }, []);

  const removeAddress = useCallback(async (id) => {
    const { user } = await api.deleteAddress(id);
    setUser(user);
    return user;
  }, []);

  const setDefaultAddr = useCallback(async (id) => {
    const { user } = await api.setDefaultAddress(id);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (err) {
      // ignore network/server errors but still clear local state
      console.warn('Logout API failed:', err.message || err);
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      requestProfileUpdate,
      confirmProfileUpdate,
      addAddress,
      editAddress,
      removeAddress,
      setDefaultAddr,
      logout,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
