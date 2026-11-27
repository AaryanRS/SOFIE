import { describe, expect, it } from 'vitest';
import { countEntitiesByType } from '../core/pii/entityCounts';
import { EntityType } from '../core/pii/types';

describe('countEntitiesByType', () => {
  it('counts repeated categories and initializes categories with no matches to zero', () => {
    const counts = countEntitiesByType([
      { type: EntityType.EMAIL },
      { type: EntityType.EMAIL },
      { type: EntityType.IP },
    ]);

    expect(counts).toEqual({
      [EntityType.EMAIL]: 2,
      [EntityType.PHONE]: 0,
      [EntityType.IP]: 1,
      [EntityType.PAN]: 0,
      [EntityType.AADHAAR]: 0,
      [EntityType.CREDIT_CARD]: 0,
    });
  });
});
