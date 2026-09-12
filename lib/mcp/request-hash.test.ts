import { describe, expect, it } from 'vitest';
import { hashMcpArguments } from './request-hash';

describe('MCP request hashing', () => {
  it('is stable across object key order while preserving nested values', () => {
    expect(hashMcpArguments({ b: 2, a: { y: true, x: ['one', 2] } })).toBe(
      hashMcpArguments({ a: { x: ['one', 2], y: true }, b: 2 })
    );
    expect(hashMcpArguments({ values: [1, 2] })).not.toBe(hashMcpArguments({ values: [2, 1] }));
  });
});
