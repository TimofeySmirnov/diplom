'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AuthStatus, PublicUser } from './auth-types';

type AuthState = {
  accessToken: string | null;
  user: PublicUser | null;
  status: AuthStatus;
  hydrated: boolean;
  setSession: (payload: { accessToken: string; user: PublicUser }) => void;
  clearSession: () => void;
  setHydrated: (value: boolean) => void;
  hasRole: (role: PublicUser['role']) => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      status: 'idle',
      hydrated: false,
      setSession: ({ accessToken, user }) => {
        set({
          accessToken,
          user,
          status: 'authenticated',
        });
      },
      clearSession: () => {
        set({
          accessToken: null,
          user: null,
          status: 'unauthenticated',
        });
      },
      setHydrated: (value) => {
        set({ hydrated: value });
      },
      hasRole: (role) => {
        return get().user?.role === role;
      },
    }),
    {
      name: 'diplom-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        status: state.status,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        if (!state?.accessToken || !state.user) {
          state?.clearSession();
        }
      },
    },
  ),
);
