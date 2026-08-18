import { describe, expect, it } from 'vitest';
import { getMcpResourceUri, isMcpResource } from './resource';

describe('MCP resource indicator validation', () => {
  it('uses the canonical MCP endpoint as the resource identifier', () => {
    expect(getMcpResourceUri('https://jobmark.example.com')).toBe(
      'https://jobmark.example.com/mcp'
    );
  });

  it('accepts only equivalent absolute resource URLs', () => {
    const expected = 'https://jobmark.example.com/mcp';
    expect(isMcpResource('HTTPS://JOBMARK.EXAMPLE.COM/mcp/', expected)).toBe(true);
    expect(isMcpResource('https://jobmark.example.com/other', expected)).toBe(false);
    expect(isMcpResource('https://jobmark.example.com/mcp?x=1', expected)).toBe(false);
    expect(isMcpResource('https://attacker.example.com/mcp', expected)).toBe(false);
  });
});
