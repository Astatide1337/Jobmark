import { describe, expect, it } from 'vitest';
import { toolDefinitions } from './index';

function expectJsonValue(value: unknown, path: string): void {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => expectJsonValue(item, `${path}[${index}]`));
    return;
  }

  expect(Object.getPrototypeOf(value), `${path} must be a plain JSON object`).toBe(
    Object.prototype
  );
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    expectJsonValue(child, `${path}.${key}`);
  }
}

describe('MCP tool schemas', () => {
  it('publishes every input schema as plain JSON Schema data', () => {
    for (const definition of toolDefinitions) {
      expect(definition.inputSchema.type, definition.name).toBe('object');
      expectJsonValue(definition.inputSchema, `${definition.name}.inputSchema`);
    }
  });

  it('does not advertise account actions that only exist in Settings', () => {
    const names = new Set(toolDefinitions.map(definition => definition.name));

    expect(names.has('account_export')).toBe(false);
    expect(names.has('account_delete')).toBe(false);
    expect(names.has('account_clear_activities')).toBe(true);
  });
});
