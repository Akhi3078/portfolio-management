import { HttpErrorResponse } from '@angular/common/http';

/**
 * RFC 9457 Problem Details, as ASP.NET Core emits it.
 *
 * `errors` is the per-field dictionary a 400 carries; its keys are the camelCase
 * field names the client sent, which is what lets a server message be shown next
 * to the control that caused it.
 */
export interface ProblemDetails {
  readonly type?: string;
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly errors?: Readonly<Record<string, readonly string[]>>;
}

function problemFrom(error: unknown): ProblemDetails | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }

  const body: unknown = error.error;

  return typeof body === 'object' && body !== null ? (body as ProblemDetails) : null;
}

/**
 * Flattens a 400's `errors` dictionary into one message per field, keyed by field
 * name, ready to drop onto a form. Returns an empty object for any other failure,
 * so callers can treat "no field errors" uniformly.
 */
export function fieldErrorsFrom(error: unknown): Record<string, string> {
  const errors = problemFrom(error)?.errors;

  if (!errors) {
    return {};
  }

  const flattened: Record<string, string> = {};

  for (const [field, messages] of Object.entries(errors)) {
    if (messages.length > 0) {
      flattened[field] = messages.join(' ');
    }
  }

  return flattened;
}

/** True for a 409. The only uniqueness rule in this API is the project code. */
export function isConflict(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 409;
}

/**
 * A single sentence to show the user. Prefers the server's own wording, because a
 * 409 explains which code clashed and a 404 says what was missing.
 */
export function messageFrom(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Something went wrong. Please try again.';
  }

  const problem = problemFrom(error);

  if (error.status === 0) {
    return 'Could not reach the API. Check that the backend is running, then retry.';
  }

  if (problem?.detail) {
    return problem.detail;
  }

  if (problem?.title) {
    return problem.title;
  }

  return `The request failed (HTTP ${error.status}).`;
}
