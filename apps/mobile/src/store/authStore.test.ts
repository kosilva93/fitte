import { useAuthStore } from './authStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ session: null, user: null, userTier: 'free' });
  });

  it('setSession with session stores the session and user', () => {
    const session = {
      access_token: 'token-123',
      user: { id: 'user-1', email: 'kevin@example.com' },
    };

    useAuthStore.getState().setSession(session as any);

    expect(useAuthStore.getState().session).toBe(session);
    expect(useAuthStore.getState().user).toEqual(session.user);
  });

  it('setSession with null clears the session and user', () => {
    useAuthStore.setState({
      session: { access_token: 'token-123', user: { id: 'user-1' } } as any,
      user: { id: 'user-1' } as any,
      userTier: 'pro',
    });

    useAuthStore.getState().setSession(null);

    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().userTier).toBe('pro');
  });

  it('signOut clears auth state and resets tier to free', () => {
    useAuthStore.setState({
      session: { access_token: 'token-123', user: { id: 'user-1' } } as any,
      user: { id: 'user-1' } as any,
      userTier: 'premium',
    });

    useAuthStore.getState().signOut();

    expect(useAuthStore.getState()).toMatchObject({
      session: null,
      user: null,
      userTier: 'free',
    });
  });
});
