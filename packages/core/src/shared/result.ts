/** Structured error shape shared by every module so agents can read failures without try/catch. */
export interface VnError {
  code: string;
  message: string;
  /** Optional hint telling the caller how to fix the input. */
  hint?: string;
}

export type Result<T> = ({ ok: true } & T) | { ok: false; error: VnError };

export function fail<T>(code: string, message: string, hint?: string): Result<T> {
  return { ok: false, error: hint ? { code, message, hint } : { code, message } };
}
