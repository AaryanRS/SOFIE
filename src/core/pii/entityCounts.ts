import { EntityType } from './types';
import type { PiiEntity } from './types';

export function createEmptyEntityCounts(): Record<EntityType, number> {
  return {
    [EntityType.EMAIL]: 0,
    [EntityType.PHONE]: 0,
    [EntityType.IP]: 0,
    [EntityType.PAN]: 0,
    [EntityType.AADHAAR]: 0,
    [EntityType.CREDIT_CARD]: 0,
  };
}

export function countEntitiesByType(
  entities: readonly Pick<PiiEntity, 'type'>[]
): Record<EntityType, number> {
  const counts = createEmptyEntityCounts();
  for (const { type } of entities) counts[type] += 1;
  return counts;
}
