import { createContext, useContext, useEffect, useState } from 'react';
import { getAuthUser, type AuthUser } from '../api/auth';
import { isAdminUser } from '../api';
import type { AdminUser } from '../types';

interface AuthState {
  user: AuthUser | null;
  adminRecord: AdminUser | null;
  isAdmin: boolean;
  isPrimary: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  adminRecord: null,
  isAdmin: false,
  isPrimary: false,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    adminRecord: null,
    isAdmin: false,
    isPrimary: false,
    loading: true,
  });

  useEffect(() => {
    getAuthUser().then(async (user) => {
      if (!user) {
        setState({ user: null, adminRecord: null, isAdmin: false, isPrimary: false, loading: false });
        return;
      }
      const adminRecord = await isAdminUser(user.username);
      setState({
        user,
        adminRecord,
        isAdmin: Boolean(adminRecord),
        isPrimary: adminRecord?.isPrimary ?? false,
        loading: false,
      });
    });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
