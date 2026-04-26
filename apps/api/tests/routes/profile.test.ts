import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import http from 'http';

vi.mock('../../src/utils/supabase', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('../../src/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { supabase } from '../../src/utils/supabase';
import profileRouter from '../../src/routes/profile';
import { errorHandler } from '../../src/middleware/errorHandler';

const mockSupabase = vi.mocked(supabase);

function buildApp(userId = 'user-1') {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.userId = userId;
    req.userTier = 'free';
    next();
  });
  app.use('/profile', profileRouter);
  app.use(errorHandler);
  return app;
}

function httpRequest(app: express.Express, method: string, path: string, body?: object) {
  return new Promise<{ status: number; body: any }>((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any).port;
      const req = http.request(
        { hostname: 'localhost', port, path, method, headers: { 'Content-Type': 'application/json' } },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            server.close();
            resolve({ status: res.statusCode!, body: JSON.parse(data || '{}') });
          });
        }
      );
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

describe('GET /profile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the user profile', async () => {
    const profile = { id: 'user-1', age: 28, city: 'NYC', gender: 'menswear' };
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: profile, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);

    const app = buildApp('user-1');
    const res = await httpRequest(app, 'GET', '/profile');

    expect(res.status).toBe(200);
    expect(res.body.profile).toEqual(profile);
  });

  it('returns 404 when profile not found', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);

    const app = buildApp('user-1');
    const res = await httpRequest(app, 'GET', '/profile');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Profile not found');
  });
});

describe('PATCH /profile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates allowed profile fields', async () => {
    const updated = { id: 'user-1', age: 30, city: 'LA' };
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);

    const app = buildApp();
    const res = await httpRequest(app, 'PATCH', '/profile', { age: 30, city: 'LA' });

    expect(res.status).toBe(200);
    expect(res.body.profile).toEqual(updated);
  });

  it('returns 400 for invalid age (> 120)', async () => {
    const app = buildApp();
    const res = await httpRequest(app, 'PATCH', '/profile', { age: 200 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
  });

  it('returns 400 for invalid age (< 1)', async () => {
    const app = buildApp();
    const res = await httpRequest(app, 'PATCH', '/profile', { age: 0 });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid gender value', async () => {
    const app = buildApp();
    const res = await httpRequest(app, 'PATCH', '/profile', { gender: 'male' }); // not in enum

    expect(res.status).toBe(400);
  });

  it('accepts valid gender values', async () => {
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { gender: 'womenswear' }, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);

    for (const gender of ['menswear', 'womenswear', 'unisex']) {
      vi.clearAllMocks();
      mockSupabase.from.mockReturnValue(mockChain as any);

      const app = buildApp();
      const res = await httpRequest(app, 'PATCH', '/profile', { gender });

      expect(res.status).toBe(200);
    }
  });

  it('returns 400 for invalid body_type', async () => {
    const app = buildApp();
    const res = await httpRequest(app, 'PATCH', '/profile', { body_type: 'tall' }); // not in enum

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid country code (not 2 chars)', async () => {
    const app = buildApp();
    const res = await httpRequest(app, 'PATCH', '/profile', { country: 'USA' });

    expect(res.status).toBe(400);
  });

  it('accepts valid country code', async () => {
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { country: 'US' }, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);

    const app = buildApp();
    const res = await httpRequest(app, 'PATCH', '/profile', { country: 'US' });

    expect(res.status).toBe(200);
  });

  it('returns 500 on DB update failure', async () => {
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);

    const app = buildApp();
    const res = await httpRequest(app, 'PATCH', '/profile', { city: 'Chicago' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to update profile');
  });

  it('passes aesthetics array correctly', async () => {
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);

    const app = buildApp();
    await httpRequest(app, 'PATCH', '/profile', {
      aesthetics: ['Minimalist', 'Streetwear'],
    });

    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ aesthetics: ['Minimalist', 'Streetwear'] })
    );
  });
});
