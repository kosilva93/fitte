import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';

// Mock logger to suppress noise in tests
vi.mock('../../src/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { errorHandler, AppError } from '../../src/middleware/errorHandler';

function makeRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response;
}

const req = {} as Request;
const next = vi.fn() as NextFunction;

describe('AppError', () => {
  it('constructs with statusCode and message', () => {
    const err = new AppError(404, 'Not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.name).toBe('AppError');
  });

  it('is an instance of Error', () => {
    expect(new AppError(400, 'bad')).toBeInstanceOf(Error);
  });
});

describe('errorHandler', () => {
  it('returns 400 with validation details for ZodError', () => {
    const schema = z.object({ name: z.string() });
    let zodError: ZodError;
    try {
      schema.parse({ name: 123 });
    } catch (e) {
      zodError = e as ZodError;
    }

    const res = makeRes();
    errorHandler(zodError!, req, res, next);

    expect((res as any).status).toHaveBeenCalledWith(400);
    expect((res as any).status().json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Validation error', details: expect.any(Array) })
    );
  });

  it('returns AppError statusCode and message', () => {
    const err = new AppError(403, 'Forbidden');
    const res = makeRes();

    errorHandler(err, req, res, next);

    expect((res as any).status).toHaveBeenCalledWith(403);
    expect((res as any).status().json).toHaveBeenCalledWith({ error: 'Forbidden' });
  });

  it('returns 500 for unknown errors', () => {
    const err = new Error('Something exploded');
    const res = makeRes();

    errorHandler(err, req, res, next);

    expect((res as any).status).toHaveBeenCalledWith(500);
    expect((res as any).status().json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });

  it('does not leak error internals for unknown errors', () => {
    const err = new Error('DB password is hunter2');
    const res = makeRes();

    errorHandler(err, req, res, next);

    const jsonCall = (res as any).status().json.mock.calls[0][0];
    expect(JSON.stringify(jsonCall)).not.toContain('hunter2');
  });

  it('handles AppError with custom 422 status', () => {
    const err = new AppError(422, 'Unprocessable entity');
    const res = makeRes();

    errorHandler(err, req, res, next);

    expect((res as any).status).toHaveBeenCalledWith(422);
  });
});
