import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/api';
import socketService from '../services/socket';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setToken: (token) => {
        localStorage.setItem('token', token);
        set({ token });
      },

      login: async (credentials) => {
        const response = await authAPI.login(credentials);
        const { token, user } = response.data;
        
        localStorage.setItem('token', token);
        socketService.connect(token);
        
        set({ user, token, isAuthenticated: true });
        return response.data;
      },

      register: async (userData) => {
        const response = await authAPI.register(userData);
        const { token, user } = response.data;
        
        localStorage.setItem('token', token);
        socketService.connect(token);
        
        set({ user, token, isAuthenticated: true });
        return response.data;
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch (e) {
          // ignore
        }
        
        localStorage.removeItem('token');
        socketService.disconnect();
        
        set({ user: null, token: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token');
        
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return false;
        }

        try {
          const response = await authAPI.getMe();
          socketService.connect(token);
          
          set({ 
            user: response.data, 
            token, 
            isAuthenticated: true, 
            isLoading: false 
          });
          return true;
        } catch (error) {
          localStorage.removeItem('token');
          set({ 
            user: null, 
            token: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
          return false;
        }
      },

      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

export default useAuthStore;
