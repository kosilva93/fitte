import { describe, it, expect } from 'vitest';

// Decision: Vitest chosen over Jest — faster, native ESM, zero config with tsx

describe('Health check', () => {
  it('returns ok status', async () => {
    // Import app lazily to avoid triggering DB connections in test setup
    const { default: app } = await import('../src/index');
    const response = await fetch(`http://localhost:3000/health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });
});
