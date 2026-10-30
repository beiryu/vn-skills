import { parseCitizenId } from '../id/index.js';
import { parsePhone } from '../phone/index.js';
import { validateTaxId } from '../taxid/index.js';
import type { Result } from '../shared/result.js';

// Standard Schema v1 types, copied from https://standardschema.dev/ so there is no runtime dependency.
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1Props<Input, Output>;
}

export interface StandardSchemaV1Props<Input = unknown, Output = Input> {
  readonly version: 1;
  readonly vendor: string;
  readonly validate: (
    value: unknown,
  ) => StandardSchemaV1Result<Output> | Promise<StandardSchemaV1Result<Output>>;
  readonly types?: { readonly input: Input; readonly output: Output } | undefined;
}
export type StandardSchemaV1Result<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: ReadonlyArray<StandardSchemaV1Issue> };
export interface StandardSchemaV1Issue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }> | undefined;
}

/** A Standard Schema issue that also carries the vn-skills error code. */
export interface VnSchemaIssue extends StandardSchemaV1Issue {
  readonly code: string;
}

type Ok<R> = R extends { ok: true } ? Omit<R, 'ok'> : never;

function make<R extends Result<object>>(
  run: (input: string) => R,
  label: string,
): StandardSchemaV1<unknown, Ok<R>> {
  return {
    '~standard': {
      version: 1,
      vendor: 'vn-skills',
      validate(value) {
        if (typeof value !== 'string') {
          const issue: VnSchemaIssue = {
            message: `Expected a string for ${label}`,
            code: 'INVALID_TYPE',
          };
          return { issues: [issue] };
        }
        const r = run(value);
        if (!r.ok) {
          const { code, message, hint } = r.error;
          const issue: VnSchemaIssue = { message: hint ? `${message} (${hint})` : message, code };
          return { issues: [issue] };
        }
        const { ok: _ok, ...rest } = r;
        return { value: rest as unknown as Ok<R> };
      },
    },
  };
}

export function vnPhone() {
  return make((s) => parsePhone(s), 'phone number');
}

export function vnTaxId() {
  return make((s) => validateTaxId(s), 'tax ID');
}

export function vnCitizenId() {
  return make((s) => parseCitizenId(s), 'citizen ID');
}
