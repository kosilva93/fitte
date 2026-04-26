import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock @supabase/supabase-js before importing the middleware
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import { authMiddleware } from '../../src/middleware/auth';

const mockCreateClient = vi.mocked(createClient);

function makeReq(authHeader?: string): Partial<Request> {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  } as Partial<Request>;
}

describe('authMiddleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  it('returns 401 when Authorization header is missing', async () => {
    const req = makeReq() as Request;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', async () => {
    const mockUserClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Invalid token') }) },
      from: vi.fn(),
    };
    mockCreateClient.mockReturnValue(mockUserClient as any);

    const req = makeReq('Bearer bad-token') as Request;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when getUser returns no user and no error', async () => {
    const mockUserClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      from: vi.fn(),
    };
    mockCreateClient.mockReturnValue(mockUserClient as any);

    const req = makeReq('Bearer some-token') as Request;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches userId and defaults to free tier when no subscription found', async () => {
    const userId = 'user-123';
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockEq1 = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    const mockUserClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
      from: mockFrom,
    };
    mockCreateClient.mockReturnValue(mockUserClient as any);

    const req = makeReq('Bearer valid-token') as Request;
    const res = {} as Response;

    await authMiddleware(req, res, next);

    expect((req as any).userId).toBe(userId);
    expect((req as any).userTier).toBe('free');
    expect(next).toHaveBeenCalledOnce();
  });

  it('attaches pro tier when valid active subscription exists', async () => {
    const userId = 'user-456';
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const mockSingle = vi.fn().mockResolvedValue({
      data: { tier: 'pro', valid_until: futureDate },
      error: null,
    });
    const mockEq1 = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    const mockUserClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
      from: mockFrom,
    };
    mockCreateClient.mockReturnValue(mockUserClient as any);

    const req = makeReq('Bearer valid-token') as Request;
    const res = {} as Response;

    await authMiddleware(req, res, next);

    expect((req as any).userTier).toBe('pro');
    expect(next).toHaveBeenCalledOnce();
  });

  it('falls back to free tier when subscription is expired', async () => {
    const userId = 'user-789';
    const pastDate = new Date(Date.now() - 1000).toISOString();
    const mockSingle = vi.fn().mockResolvedValue({
      data: { tier: 'premium', valid_until: pastDate },
      error: null,
    });
    const mockEq1 = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    const mockUserClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
      from: mockFrom,
    };
    mockCreateClient.mockReturnValue(mockUserClient as any);

    const req = makeReq('Bearer valid-token') as Request;
    const res = {} as Response;

    await authMiddleware(req, res, next);

    expect((req as any).userTier).toBe('free');
    expect(next).toHaveBeenCalledOnce();
  });

  it('strips Bearer prefix from token before calling getUser', async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('bad') });
    mockCreateClient.mockReturnValue({ auth: { getUser }, from: vi.fn() } as any);

    const req = makeReq('Bearer my-actual-token') as Request;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;

    await authMiddleware(req, res, next);

    expect(getUser).toHaveBeenCalledWith('my-actual-token');
  });
});
