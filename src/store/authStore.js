import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (user, token, refreshToken) =>
        set({ user, token, refreshToken: refreshToken ?? null, isAuthenticated: true }),

      logout: () =>
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false }),

      updateUser: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),

      setToken: (token) => set({ token }),
    }),
    {
      name: 'sowhatson-admin-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
