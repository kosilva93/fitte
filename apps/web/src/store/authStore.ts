import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';

type Tier = 'free' | 'pro' | 'premium';

interface AuthState {
  session: Session | null;
  user: User | null;
  userTier: Tier;
  setSession: (session: Session | null) => void;
  setUserTier: (tier: Tier) => void;
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
