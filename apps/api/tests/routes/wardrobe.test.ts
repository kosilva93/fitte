import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

// Mock supabase util before importing routes
vi.mock('../../src/utils/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}));

vi.mock('../../src/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { supabase } from '../../src/utils/supabase';
import wardrobeRouter from '../../src/routes/wardrobe';
import { errorHandler } from '../../src/middleware/errorHandler';

const mockSupabase = vi.mocked(supabase);

// Build a minimal Express app with auth state injected via middleware
function buildApp(userId = 'user-1', userTier: 'free' | 'pro' | 'premium' = 'free') {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).userId = userId;
    (req as any).userTier = userTier;
    next();
  });
  app.use('/wardrobe', wardrobeRouter);
  app.use(errorHandler);
  return app;
}

async function request(app: express.Express, method: string, path: string, body?: object) {
  // Use a one-shot server for isolation
  const http = await import('http');
  return new Promise<{ status: number; body: any }>((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any).port;
      const opts = {
        hostname: 'localhost',
        port,
        path,
        method: method.toUpperCase(),
        headers: { 'Content-Type': 'application/json' },
      };
      const req = http.request(opts, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode!, body: JSON.parse(data || '{}') });
        });
      });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

describe('GET /wardrobe', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns items for the authenticated user', async () => {
    const items = [{ id: '1', item_type: 'top', colors: [] }];
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: items, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);

    const app = buildApp('user-1', 'free');
    const res = await request(app, 'GET', '/wardrobe');

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual(items);
  });

  it('returns 500 when supabase errors', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);

    const app = buildApp();
    const res = await request(app, 'GET', '/wardrobe');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to fetch wardrobe items');
  });
});

describe('POST /wardrobe/items', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a wardrobe item with valid body', async () => {
    const newItem = { id: 'item-1', item_type: 'top', colors: ['black'] };
    const mockChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newItem, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);

    const app = buildApp('user-1', 'pro');
    const res = await request(app, 'POST', '/wardrobe/items', {
      item_type: 'top',
      colors: ['black'],
    });

    expect(res.status).toBe(201);
    expect(res.body.item).toEqual(newItem);
  });

  it('returns 400 for invalid item_type', async () => {
    // Use pro tier to skip free-tier count check and reach Zod validation
    const app = buildApp('user-1', 'pro');
    const res = await request(app, 'POST', '/wardrobe/items', {
      item_type: 'socks', // not in enum
      colors: [],
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
  });

  it('returns 400 when item_type is missing', async () => {
    const app = buildApp('user-1', 'pro');
    const res = await request(app, 'POST', '/wardrobe/items', { colors: ['blue'] });

    expect(res.status).toBe(400);
  });

  it('sets classification_status to pending when photo_path is provided', async () => {
    const mockChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);

    const app = buildApp('user-1', 'pro');
    await request(app, 'POST', '/wardrobe/items', {
      item_type: 'top',
      colors: [],
      photo_path: 'user-1/1234567890.jpg',
    });

    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ classification_status: 'pending' })
    );
  });

  it('sets classification_status to complete when no photo_path', async () => {
    const mockChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);

    const app = buildApp('user-1', 'pro');
    await request(app, 'POST', '/wardrobe/items', { item_type: 'shoes', colors: [] });

    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ classification_status: 'complete' })
    );
  });
});

describe('POST /wardrobe/upload-url — free tier limit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('blocks upload when free tier user has 10 items', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ count: 10, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);

    const app = buildApp('user-1', 'free');
    const res = await request(app, 'POST', '/wardrobe/upload-url', {});

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Free tier limit');
  });

  it('allows upload for pro user regardless of item count', async () => {
    const mockStorageChain = {
      createSignedUploadUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://storage.example.com/upload' },
        error: null,
      }),
    };
    (mockSupabase.storage.from as any) = vi.fn().mockReturnValue(mockStorageChain);

    const app = buildApp('user-1', 'pro');
    const res = await request(app, 'POST', '/wardrobe/upload-url', {});

    expect(res.status).toBe(200);
    expect(res.body.uploadUrl).toBeDefined();
  });
});

describe('DELETE /wardrobe/items/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('soft deletes an item', async () => {
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: 'item-123' }], error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);

    const app = buildApp('user-1', 'free');
    const res = await request(app, 'DELETE', '/wardrobe/items/item-123');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
