/**
 * MCP Errors - mapped to MCP protocol error codes
 */

export class McpError extends Error {
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
  constructor(message: string, public readonly fieldErrors?: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', { fieldErrors });
    this.name = 'McpValidationError';
  }
}

export class McpNotFoundError extends McpError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', { resource });
    this.name = 'McpNotFoundError';
  }
}

export class McpForbiddenError extends McpError {
  constructor(message = 'Access denied') {
    super(message, 'FORBIDDEN');
    this.name = 'McpForbiddenError';
  }
}

export class McpVaultLockedError extends McpError {
  constructor(message = 'Vault is locked') {
    super(message, 'VAULT_LOCKED');
    this.name = 'McpVaultLockedError';
  }
}

export class McpUserActionRequiredError extends McpError {
  constructor(
    message: string,
    public readonly actionUrl: string,
    public readonly expiresAt: string
  ) {
    super(message, 'USER_ACTION_REQUIRED', { actionUrl, expiresAt });
    this.name = 'McpUserActionRequiredError';
  }
}

export class McpConfirmationRequiredError extends McpError {
  constructor(message: string, public readonly requiredPhrase?: string) {
    super(message, 'CONFIRMATION_REQUIRED', { requiredPhrase });
    this.name = 'McpConfirmationRequiredError';
  }
}

export class McpConflictError extends McpError {
  constructor(message: string) {
    super(message, 'CONFLICT');
    this.name = 'McpConflictError';
  }
}

export class McpRateLimitedError extends McpError {
  constructor(message: string, public readonly retryAfter: number) {
    super(message, 'RATE_LIMITED', { retryAfter });
    this.name = 'McpRateLimitedError';
  }
}

export class McpInternalError extends McpError {
  constructor(message = 'Internal server error') {
    super(message, 'INTERNAL_ERROR');
    this.name = 'McpInternalError';
  }
}

export class McpInsufficientScopeError extends McpError {
  constructor(message = 'Insufficient scope', public readonly requiredScope?: string) {
    super(message, 'INSUFFICIENT_SCOPE', { requiredScope });
    this.name = 'McpInsufficientScopeError';
  }
}

export class McpUnauthenticatedError extends McpError {
  constructor(message = 'Unauthenticated') {
    super(message, 'UNAUTHENTICATED');
    this.name = 'McpUnauthenticatedError';
  }
}

export function toMcpErrorResponse(error: unknown): {
  code: number;
  message: string;
  data?: Record<string, unknown>;
} {
  if (error instanceof McpError) {
    const statusMap: Record<string, number> = {
      VALIDATION_ERROR: 400,
      NOT_FOUND: 404,
      FORBIDDEN: 403,
      VAULT_LOCKED: 403,
      USER_ACTION_REQUIRED: 400,
      CONFIRMATION_REQUIRED: 400,
      CONFLICT: 409,
      RATE_LIMITED: 429,
      INTERNAL_ERROR: 500,
      INSUFFICIENT_SCOPE: 403,
      UNAUTHENTICATED: 401,
    };
    return {
      code: statusMap[error.code] || 500,
      message: error.message,
      data: error.data,
    };
  }
  if (error instanceof Error) {
    return { code: 500, message: error.message };
  }
  return { code: 500, message: 'Unknown error' };
}
