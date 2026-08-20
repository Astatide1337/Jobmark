/**
 * MCP Errors - mapped to MCP protocol error codes
 */

class McpError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'McpError';
  }
}

export class McpValidationError extends McpError {
  constructor(
    message: string,
    public readonly fieldErrors?: Record<string, string[]>
  ) {
    super(
      message === 'Invalid input' ? 'Check the details and try again.' : message,
      'VALIDATION_ERROR',
      {
        fieldErrors,
      }
    );
    this.name = 'McpValidationError';
  }
}

export class McpNotFoundError extends McpError {
  constructor(resource: string) {
    super(`${resource} not found.`, 'NOT_FOUND', { resource });
    this.name = 'McpNotFoundError';
  }
}

export class McpForbiddenError extends McpError {
  constructor(message = 'You do not have access to this.') {
    super(message, 'FORBIDDEN');
    this.name = 'McpForbiddenError';
  }
}

export class McpVaultLockedError extends McpError {
  constructor(message = 'Open private projects first.') {
    super(message, 'VAULT_LOCKED');
    this.name = 'McpVaultLockedError';
  }
}
