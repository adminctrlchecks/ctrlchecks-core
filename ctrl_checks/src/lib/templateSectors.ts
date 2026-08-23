export const TEMPLATE_SECTORS = [
  'Business Verification & Compliance',
  'Healthcare & Clinics',
  'Finance, Accounting & Insurance',
  'Sales, Support & Internal Operations',
  'AI Agent',
] as const;

export type TemplateSector = (typeof TEMPLATE_SECTORS)[number];

export const TEMPLATE_SECTOR_OPTIONS = ['All sectors', ...TEMPLATE_SECTORS] as const;

export type TemplateSectorFilter = (typeof TEMPLATE_SECTOR_OPTIONS)[number];

export function isKnownTemplateSector(value: string | null | undefined): value is TemplateSector {
  return TEMPLATE_SECTORS.includes(value as TemplateSector);
}
