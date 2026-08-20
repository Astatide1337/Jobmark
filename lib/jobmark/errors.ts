/**
 * Domain errors for Jobmark
 */

class JobmarkError extends Error {
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
  constructor(
    message: string,
    public readonly fieldErrors?: Record<string, string[]>
  ) {
    super(
      message === 'Validation failed' ? 'Check the details and try again.' : message,
      'VALIDATION_ERROR',
      { fieldErrors }
    );
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends JobmarkError {
  constructor(resource: string, id?: string) {
    super(`${resource} not found.`, 'NOT_FOUND', { resource, id });
    this.name = 'NotFoundError';
  }
}

export class VaultLockedError extends JobmarkError {
  constructor(message = 'Open private projects first.') {
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
  constructor(
    message: string,
    public readonly requiredPhrase?: string
  ) {
    super(message, 'CONFIRMATION_REQUIRED', { requiredPhrase });
    this.name = 'ConfirmationRequiredError';
  }
}
