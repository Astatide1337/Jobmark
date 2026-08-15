import { describe, expect, it } from 'vitest';
import { getErrorMessage } from './page';

describe('MCP authorization error page', () => {
  it('explains known OAuth failures without echoing untrusted input', () => {
    expect(getErrorMessage('unauthorized_client')).toBe('Jobmark could not recognize this AI app.');
    expect(getErrorMessage('https://attacker.example/?message=secret')).toBe(
      'The connection request could not be completed.'
    );
  });
});
