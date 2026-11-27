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

/**
 * Normalizes an entity value for consistent lookup in the pseudonym map.
 * E.g., emails case-insensitive, PANs uppercase, phones/cards/aadhaar strip extraneous space differences.
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
      // Normalize separators so +91 9876543210 and +91 9876543210 match consistently
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
    this.counters = {
      [EntityType.EMAIL]: 0,
      [EntityType.PHONE]: 0,
      [EntityType.IP]: 0,
      [EntityType.PAN]: 0,
      [EntityType.AADHAAR]: 0,
      [EntityType.CREDIT_CARD]: 0,
    };

    // Reconstruct counters if an initial map was provided
    if (initialMap) {
      for (const [key, placeholder] of initialMap.entries()) {
        const typePrefix = key.split(':')[0] as EntityType;
        const match = placeholder.match(/_(\d+)$/);
        if (match && typePrefix in this.counters) {
          const num = parseInt(match[1], 10);
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

    if (this.map.has(key)) {
      return this.map.get(key)!;
    }

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
    for (const key of Object.keys(this.counters)) {
      this.counters[key as EntityType] = 0;
    }
  }

  /**
   * Returns a copy of the internal map.
   */
  public getMap(): Map<string, string> {
    return new Map(this.map);
  }
}
