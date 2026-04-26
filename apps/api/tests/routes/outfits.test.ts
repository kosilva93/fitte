import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import http from 'http';

vi.mock('../../src/utils/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('../../src/services/outfitService', () => ({
  generateOutfit: vi.fn(),
}));

vi.mock('../../src/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { supabase } from '../../src/utils/supabase';
import { generateOutfit } from '../../src/services/outfitService';
import outfitsRouter from '../../src/routes/outfits';
import { errorHandler } from '../../src/middleware/errorHandler';

const mockSupabase = vi.mocked(supabase);
const mockGenerateOutfit = vi.mocked(generateOutfit);

function buildApp(userId = 'user-1', userTier: 'free' | 'pro' | 'premium' = 'free') {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.userId = userId;
    req.userTier = userTier;
    next();
  });
  app.use('/outfits', outfitsRouter);
  app.use(errorHandler);
  return app;
}

function httpRequest(app: express.Express, method: string, path: string, body?: object) {
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
        res.on('data', (c) => (data += c));
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

describe('POST /outfits/generate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when occasion is missing', async () => {
    const app = buildApp('user-1', 'pro');
    const res = await httpRequest(app, 'POST', '/outfits/generate', { vibe: 'casual' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
  });

  it('returns 400 when occasion is empty string', async () => {
    const app = buildApp('user-1', 'pro');
    const res = await httpRequest(app, 'POST', '/outfits/generate', { occasion: '' });

    expect(res.status).toBe(400);
  });

  it('generates outfits for pro user without weekly limit check', async () => {
    const outfits = [{ outfit_name: 'Casual Friday', items: [] }];
    mockGenerateOutfit.mockResolvedValue(outfits as any);
    mockSupabase.rpc.mockResolvedValue({ error: null } as any);

    const app = buildApp('user-1', 'pro');
    const res = await httpRequest(app, 'POST', '/outfits/generate', {
      occasion: 'date night',
      vibe: 'romantic',
    });

    expect(res.status).toBe(200);
    expect(res.body.outfits).toEqual(outfits);
    expect(mockGenerateOutfit).toHaveBeenCalledWith('user-1', expect.objectContaining({
      occasion: 'date night',
      vibe: 'romantic',
    }));
  });

  it('blocks free user who has reached weekly limit (3 outfits)', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { outfit_count: 3 },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);

    const app = buildApp('user-1', 'free');
    const res = await httpRequest(app, 'POST', '/outfits/generate', { occasion: 'work' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Weekly outfit limit');
    expect(mockGenerateOutfit).not.toHaveBeenCalled();
  });

  it('allows free user who has used fewer than 3 outfits', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { outfit_count: 2 },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);
    mockGenerateOutfit.mockResolvedValue([{ outfit_name: 'Monday look' }] as any);
    mockSupabase.rpc.mockResolvedValue({ error: null } as any);

    const app = buildApp('user-1', 'free');
    const res = await httpRequest(app, 'POST', '/outfits/generate', { occasion: 'work' });

    expect(res.status).toBe(200);
    expect(mockGenerateOutfit).toHaveBeenCalledOnce();
  });

  it('allows free user with no prior usage (null counter)', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);
    mockGenerateOutfit.mockResolvedValue([{ outfit_name: 'Fresh start' }] as any);
    mockSupabase.rpc.mockResolvedValue({ error: null } as any);

    const app = buildApp('user-1', 'free');
    const res = await httpRequest(app, 'POST', '/outfits/generate', { occasion: 'brunch' });

    expect(res.status).toBe(200);
  });

  it('increments usage counter after successful generation', async () => {
    // Free user with 1 outfit used
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { outfit_count: 1 }, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);
    mockGenerateOutfit.mockResolvedValue([{ outfit_name: 'Look 2' }] as any);
    mockSupabase.rpc.mockResolvedValue({ error: null } as any);

    const app = buildApp('user-1', 'free');
    await httpRequest(app, 'POST', '/outfits/generate', { occasion: 'gym' });

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'increment_outfit_counter',
      expect.objectContaining({ p_user_id: 'user-1' })
    );
  });

  it('passes optional fields (venue, time_of_day) to generateOutfit', async () => {
    mockGenerateOutfit.mockResolvedValue([] as any);
    mockSupabase.rpc.mockResolvedValue({ error: null } as any);

    const app = buildApp('user-1', 'premium');
    await httpRequest(app, 'POST', '/outfits/generate', {
      occasion: 'gala',
      vibe: 'black tie',
      venue: 'Museum of Modern Art',
      time_of_day: 'evening',
    });

    expect(mockGenerateOutfit).toHaveBeenCalledWith('user-1', expect.objectContaining({
      venue: 'Museum of Modern Art',
      time_of_day: 'evening',
    }));
  });
});

describe('GET /outfits (lookbook)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns saved outfits only', async () => {
    const savedOutfits = [{ id: '1', saved: true, outfit_name: 'Date Night' }];
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: savedOutfits, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);

    const app = buildApp();
    const res = await httpRequest(app, 'GET', '/outfits');

    expect(res.status).toBe(200);
    expect(res.body.outfits).toEqual(savedOutfits);
  });

  it('returns 500 on DB error', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: new Error('timeout') }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);

    const app = buildApp();
    const res = await httpRequest(app, 'GET', '/outfits');

    expect(res.status).toBe(500);
  });
});

describe('PATCH /outfits/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves an outfit to lookbook', async () => {
    const updated = { id: 'o-1', saved: true };
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);

    const app = buildApp();
    const res = await httpRequest(app, 'PATCH', '/outfits/o-1', { saved: true });

    expect(res.status).toBe(200);
    expect(res.body.outfit).toEqual(updated);
  });

  it('rejects invalid feedback value', async () => {
    const app = buildApp();
    const res = await httpRequest(app, 'PATCH', '/outfits/o-1', {
      feedback: 'meh', // not in enum
    });

    expect(res.status).toBe(400);
  });

  it('accepts loved feedback', async () => {
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { feedback: 'loved' }, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain as any);

    const app = buildApp();
    const res = await httpRequest(app, 'PATCH', '/outfits/o-1', { feedback: 'loved' });

    expect(res.status).toBe(200);
  });
});
