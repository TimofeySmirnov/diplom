'use client';

import { useMemo } from 'react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth/auth-store';

export function useAuth() {
  const {
    accessToken,
    user,
    status,
    hydrated,
    setSession,
    clearSession,
    hasRole,
  } = useAuthStore();

  return useMemo(
    () => ({
      accessToken,
      user,
      status,
      hydrated,
      isAuthenticated: status === 'authenticated' && Boolean(accessToken),
      hasRole,
      setSession,
      clearSession,
      refreshProfile: async () => {
        if (!accessToken) return null;
        const profile = await authApi.me(accessToken);
        setSession({ accessToken, user: profile });
        return profile;
      },
    }),
    [accessToken, user, status, hydrated, hasRole, setSession, clearSession],
  );
}
