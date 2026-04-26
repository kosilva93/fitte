import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireTier } from '../../src/middleware/requireTier';

function makeReq(tier: 'free' | 'pro' | 'premium'): Request {
  return { userTier: tier } as unknown as Request;
}

function makeRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response & { status: typeof status; json: typeof json };
}

describe('requireTier', () => {
  it('blocks free user from pro route', () => {
    const req = makeReq('free');
    const res = makeRes();
    const next = vi.fn();

    requireTier('pro')(req, res, next);

    expect((res as any).status).toHaveBeenCalledWith(403);
    expect((res as any).status().json).toHaveBeenCalledWith({
      error: 'Upgrade required',
      requiredTier: 'pro',
      currentTier: 'free',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks free user from premium route', () => {
    const req = makeReq('free');
    const res = makeRes();
    const next = vi.fn();

    requireTier('premium')(req, res, next);

    expect((res as any).status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks pro user from premium route', () => {
    const req = makeReq('pro');
    const res = makeRes();
    const next = vi.fn();

    requireTier('premium')(req, res, next);

    expect((res as any).status).toHaveBeenCalledWith(403);
    expect((res as any).status().json).toHaveBeenCalledWith(
      expect.objectContaining({ currentTier: 'pro', requiredTier: 'premium' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('allows pro user to access pro route', () => {
    const req = makeReq('pro');
    const res = makeRes();
    const next = vi.fn();

    requireTier('pro')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((res as any).status).not.toHaveBeenCalled();
  });

  it('allows premium user to access pro route', () => {
    const req = makeReq('premium');
    const res = makeRes();
    const next = vi.fn();

    requireTier('pro')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('allows premium user to access premium route', () => {
    const req = makeReq('premium');
    const res = makeRes();
    const next = vi.fn();

    requireTier('premium')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('allows any tier to access free route', () => {
    for (const tier of ['free', 'pro', 'premium'] as const) {
      const req = makeReq(tier);
      const res = makeRes();
      const next = vi.fn();

      requireTier('free')(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    }
  });
});
