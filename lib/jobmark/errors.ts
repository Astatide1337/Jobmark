/**
 * Domain errors for Jobmark
 */

export class JobmarkError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'JobmarkError';
  }
}

export class ValidationError extends JobmarkError {
  constructor(message: string, public readonly fieldErrors?: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', { fieldErrors });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends JobmarkError {
  constructor(resource: string, id?: string) {
    super(`${resource} not found${id ? `: ${id}` : ''}`, 'NOT_FOUND', { resource, id });
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends JobmarkError {
  constructor(message = 'Access denied') {
    super(message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class VaultLockedError extends JobmarkError {
  constructor(message = 'Vault is locked') {
    super(message, 'VAULT_LOCKED');
    this.name = 'VaultLockedError';
  }
}

export class UserActionRequiredError extends JobmarkError {
  constructor(
    message: string,
    public readonly actionUrl: string,
    public readonly expiresAt: string
  ) {
    super(message, 'USER_ACTION_REQUIRED', { actionUrl, expiresAt });
    this.name = 'UserActionRequiredError';
  }
}

export class ConfirmationRequiredError extends JobmarkError {
  constructor(message: string, public readonly requiredPhrase?: string) {
    super(message, 'CONFIRMATION_REQUIRED', { requiredPhrase });
    this.name = 'ConfirmationRequiredError';
  }
}

export class ConflictError extends JobmarkError {
  constructor(message: string) {
    super(message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitedError extends JobmarkError {
  constructor(message: string, public readonly retryAfter: number) {
    super(message, 'RATE_LIMITED', { retryAfter });
    this.name = 'RateLimitedError';
  }
}

export class UpstreamAIError extends JobmarkError {
  constructor(message: string, public readonly provider?: string) {
    super(message, 'UPSTREAM_AI_FAILED', { provider });
    this.name = 'UpstreamAIError';
  }
}

export class InternalError extends JobmarkError {
  constructor(message = 'Internal server error') {
    super(message, 'INTERNAL_ERROR');
    this.name = 'InternalError';
  }
}

export class InsufficientScopeError extends JobmarkError {
  constructor(message = 'Insufficient scope', public readonly requiredScope?: string) {
    super(message, 'INSUFFICIENT_SCOPE', { requiredScope });
    this.name = 'InsufficientScopeError';
  }
}

export class UnauthenticatedError extends JobmarkError {
  constructor(message = 'Unauthenticated') {
    super(message, 'UNAUTHENTICATED');
    this.name = 'UnauthenticatedError';
  }
}

export function toMCPError(error: unknown): { code: string; message: string; data?: Record<string, unknown> } {
  if (error instanceof JobmarkError) {
    return { code: error.code, message: error.message, data: error.data };
  }
  if (error instanceof Error) {
    return { code: 'INTERNAL_ERROR', message: error.message };
  }
  return { code: 'INTERNAL_ERROR', message: 'Unknown error' };
}