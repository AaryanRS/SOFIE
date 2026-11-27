/**
 * PII entity types supported by SOFIE's detection engine.
 * Using a string enum keeps the values human-readable in JSON output
 * while still giving full TypeScript type safety.
 */
export enum EntityType {
  EMAIL = 'email',
  PHONE = 'phone',
  IP = 'ip',
  PAN = 'pan',
  AADHAAR = 'aadhaar',
  CREDIT_CARD = 'credit_card',
}

/**
 * A single detected PII entity in the original text.
 *
 * - `type`  : what kind of PII this is
 * - `value` : the exact substring from the original text (never normalised)
 * - `start` : inclusive character index in the original text
 * - `end`   : exclusive character index (i.e. text.slice(start, end) === value)
 *
 * The model is intentionally minimal so later phases can extend it
 * (e.g. add `maskingStrategy`, `pseudonymId`, `confidence`, etc.)
 */
export interface PiiEntity {
  type: EntityType;
  value: string;
  start: number;
  end: number;
}
