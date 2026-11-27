/**
 * pseudonymization.ts
 *
 * Implements deterministic, session-scoped consistent pseudonymization.
 * Repeated values map to the same placeholder (e.g. EMAIL_01).
 * Different values receive the next available number (EMAIL_02).
 * Separate entity types use separate counters and prefixes starting at 01.
 */

import { EntityType } from '../pii/types';

export const PSEUDONYM_PREFIXES: Record<EntityType, string> = {
  [EntityType.EMAIL]: 'EMAIL',
  [EntityType.PHONE]: 'PHONE',
  [EntityType.IP]: 'IP',
  [EntityType.PAN]: 'PAN',
  [EntityType.AADHAAR]: 'AADHAAR',
  [EntityType.CREDIT_CARD]: 'CARD',
};

const ENTITY_TYPE_VALUES: readonly string[] = Object.values(EntityType);

const INITIAL_COUNTERS: Record<EntityType, number> = {
  [EntityType.EMAIL]: 0,
  [EntityType.PHONE]: 0,
  [EntityType.IP]: 0,
  [EntityType.PAN]: 0,
  [EntityType.AADHAAR]: 0,
  [EntityType.CREDIT_CARD]: 0,
};

function isEntityType(value: string): value is EntityType {
  return ENTITY_TYPE_VALUES.includes(value);
}

/**
 * Normalizes an entity value for consistent lookup in the pseudonym map.
 * E.g., emails are case-insensitive and PANs are uppercase; other values are trimmed.
 */
export function normalizeForPseudonym(type: EntityType, value: string): string {
  switch (type) {
    case EntityType.EMAIL:
      return value.trim().toLowerCase();
    case EntityType.PAN:
      return value.trim().toUpperCase();
    case EntityType.PHONE:
    case EntityType.AADHAAR:
    case EntityType.CREDIT_CARD:
      // Collapse repeated whitespace without changing punctuation or digit groups.
      return value.trim().replace(/\s+/g, ' ');
    case EntityType.IP:
    default:
      return value.trim();
  }
}

/**
 * Session-scoped pseudonymizer.
 * Tracks assigned identifiers per entity type.
 */
export class Pseudonymizer {
  private map: Map<string, string>;
  private counters: Record<EntityType, number>;

  constructor(initialMap?: Map<string, string>) {
    this.map = initialMap ? new Map(initialMap) : new Map();
    this.counters = { ...INITIAL_COUNTERS };

    // Reconstruct counters if an initial map was provided
    if (initialMap) {
      for (const [key, placeholder] of initialMap.entries()) {
        const typePrefix = key.split(':', 1)[0];
        const match = placeholder.match(/_(\d+)$/);
        if (match && isEntityType(typePrefix)) {
          const num = Number(match[1]);
          if (num > this.counters[typePrefix]) {
            this.counters[typePrefix] = num;
          }
        }
      }
    }
  }

  /**
   * Returns the consistent pseudonym for a given entity type and value.
   * If already seen, returns the existing placeholder.
   * If new, generates the next available placeholder (starting at 01).
   */
  public getPseudonym(type: EntityType, rawValue: string): string {
    const norm = normalizeForPseudonym(type, rawValue);
    const key = `${type}:${norm}`;

    const existing = this.map.get(key);
    if (existing !== undefined) return existing;

    this.counters[type] += 1;
    const prefix = PSEUDONYM_PREFIXES[type];
    const numStr = String(this.counters[type]).padStart(2, '0');
    const placeholder = `${prefix}_${numStr}`;

    this.map.set(key, placeholder);
    return placeholder;
  }

  /**
   * Resets all session mappings and counters.
   */
  public reset(): void {
    this.map.clear();
    this.counters = { ...INITIAL_COUNTERS };
  }

  /**
   * Returns a copy of the internal map.
   */
  public getMap(): Map<string, string> {
    return new Map(this.map);
  }
}
