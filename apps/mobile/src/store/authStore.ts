import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  userTier: 'free' | 'pro' | 'premium';
  setSession: (session: Session | null) => void;
  setUserTier: (tier: 'free' | 'pro' | 'premium') => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  userTier: 'free',
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setUserTier: (userTier) => set({ userTier }),
  signOut: () => set({ session: null, user: null, userTier: 'free' }),
}));
