import type { PublicError, PublicErrorCode } from './types';

export class AgenticFormError extends Error {
  public readonly code: PublicErrorCode;
  public readonly field?: string;
  public readonly details?: Record<string, unknown>;
  public readonly status: number;

  constructor(error: PublicError, status = 400) {
    super(error.message);
    this.name = 'AgenticFormError';
    this.code = error.code;
    this.field = error.field;
    this.details = error.details;
    this.status = status;
  }

  toResponse(): PublicError {
    return {
      code: this.code,
      message: this.message,
      ...(this.field ? { field: this.field } : {}),
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

export function publicError(code: PublicErrorCode, message: string, status = 400, field?: string) {
  return new AgenticFormError({ code, message, field }, status);
}

