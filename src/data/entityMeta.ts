/**
 * entityMeta.ts
 * Display metadata for each EntityType — label, colour, accessible description.
 * Centralised here so both highlight and list components stay in sync.
 */
import { EntityType } from '../core/pii/index';

export interface EntityMeta {
  label: string;
  shortLabel: string;
  color: string;        // background highlight colour (WCAG-safe on dark text)
  borderColor: string;  // border/accent colour
  description: string;  // aria description
}

export const ENTITY_META: Record<EntityType, EntityMeta> = {
  [EntityType.EMAIL]: {
    label: 'EMAIL',
    shortLabel: 'EMAIL',
    color: '#FFD166',
    borderColor: '#E6B800',
    description: 'Email address',
  },
  [EntityType.PHONE]: {
    label: 'PHONE',
    shortLabel: 'PHONE',
    color: '#A8E6CF',
    borderColor: '#2D9E6B',
    description: 'Phone number',
  },
  [EntityType.IP]: {
    label: 'IP ADDRESS',
    shortLabel: 'IP',
    color: '#FFB3BA',
    borderColor: '#D94F5C',
    description: 'IP address',
  },
  [EntityType.PAN]: {
    label: 'PAN',
    shortLabel: 'PAN',
    color: '#B5DEFF',
    borderColor: '#1A7FCC',
    description: 'Indian PAN number',
  },
  [EntityType.AADHAAR]: {
    label: 'AADHAAR',
    shortLabel: 'AADHAAR',
    color: '#E8C9FF',
    borderColor: '#8E44C4',
    description: 'Indian Aadhaar number',
  },
  [EntityType.CREDIT_CARD]: {
    label: 'CREDIT CARD',
    shortLabel: 'CC',
    color: '#FF9F7F',
    borderColor: '#FF4D00',
    description: 'Credit card number',
  },
};

/** Canonical display order for the summary table */
export const ENTITY_ORDER: EntityType[] = [
  EntityType.EMAIL,
  EntityType.PHONE,
  EntityType.IP,
  EntityType.PAN,
  EntityType.AADHAAR,
  EntityType.CREDIT_CARD,
];
