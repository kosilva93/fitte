import { apiGet, apiPost, apiDelete, apiPatch } from './api';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

const mockGetSession = supabase.auth.getSession as jest.Mock;

describe('mobile api client', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn() as unknown as typeof fetch;
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    });
  });

  it('apiGet with authenticated session sends bearer token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ items: [] }),
    });

    const result = await apiGet<{ items: unknown[] }>('/wardrobe');

    expect(result).toEqual({ items: [] });
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/wardrobe', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-123',
      },
    });
  });

  it('apiPost with request body serializes JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ item: { id: 'item-1' } }),
    });

    await apiPost('/wardrobe/items', { item_type: 'top', colors: ['black'] });

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/wardrobe/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-123',
      },
      body: JSON.stringify({ item_type: 'top', colors: ['black'] }),
    });
  });

  it('apiDelete with failed response throws API error message', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: 'Item not found' }),
    });

    await expect(apiDelete('/wardrobe/items/missing')).rejects.toThrow('Item not found');
  });

  it('apiPatch without session throws before fetch', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await expect(apiPatch('/outfits/o-1', { saved: true })).rejects.toThrow('Not authenticated');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
