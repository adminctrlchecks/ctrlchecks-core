import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getIntegrationLogo, INTEGRATION_LOGO_MAP } from '../integrationLogos';

describe('INTEGRATION_LOGO_MAP', () => {
  it('maps representative providers to exact local logo paths', () => {
    expect(INTEGRATION_LOGO_MAP.google).toBe('/integrations-logos/Google.svg');
    expect(INTEGRATION_LOGO_MAP.gmail).toBe('/integrations-logos/Gmail.svg');
    expect(INTEGRATION_LOGO_MAP.google_gmail).toBe('/integrations-logos/Gmail.svg');
    expect(INTEGRATION_LOGO_MAP.google_sheets).toBe('/integrations-logos/Google-Sheets.svg');
    expect(INTEGRATION_LOGO_MAP.openai).toBe('/integrations-logos/OpenAI-GPT.svg');
    expect(INTEGRATION_LOGO_MAP.openai_gpt).toBe('/integrations-logos/OpenAI-GPT.svg');
    expect(INTEGRATION_LOGO_MAP.postgres).toBe('/integrations-logos/Postgre-Sql.svg');
    expect(INTEGRATION_LOGO_MAP.postgresql).toBe('/integrations-logos/Postgre-Sql.svg');
    expect(INTEGRATION_LOGO_MAP.whatsapp).toBe('/integrations-logos/Whatsapp-Cloude.svg');
    expect(INTEGRATION_LOGO_MAP.whatsapp_cloud).toBe('/integrations-logos/Whatsapp-Cloude.svg');
  });

  it('uses local integration logo svg paths for every mapped provider', () => {
    for (const logoPath of Object.values(INTEGRATION_LOGO_MAP)) {
      expect(logoPath).toMatch(/^\/integrations-logos\/.+\.svg$/);
    }
  });

  it('references logo files that exist in public/integrations-logos', () => {
    for (const logoPath of Object.values(INTEGRATION_LOGO_MAP)) {
      const relativePath = logoPath.replace(/^\//, '');
      expect(existsSync(join(process.cwd(), 'public', relativePath))).toBe(true);
    }
  });
});

describe('getIntegrationLogo', () => {
  it('returns the mapped logo for exact node type keys', () => {
    expect(getIntegrationLogo('github')).toBe('/integrations-logos/Github.svg');
    expect(getIntegrationLogo('discord_webhook')).toBe('/integrations-logos/Discord.svg');
    expect(getIntegrationLogo('google_calendar')).toBe('/integrations-logos/Google-Calender.svg');
    expect(getIntegrationLogo('aws_s3')).toBe('/integrations-logos/AWS-S3.svg');
  });

  it('normalizes uppercase node types before lookup', () => {
    expect(getIntegrationLogo('GITHUB')).toBe('/integrations-logos/Github.svg');
    expect(getIntegrationLogo('GOOGLE_BIGQUERY')).toBe('/integrations-logos/Google-Bigquery.svg');
  });

  it('normalizes hyphenated and space-separated node types before lookup', () => {
    expect(getIntegrationLogo('google-sheets')).toBe('/integrations-logos/Google-Sheets.svg');
    expect(getIntegrationLogo('google docs')).toBe('/integrations-logos/Google-Docs.svg');
    expect(getIntegrationLogo('whatsapp cloud')).toBe('/integrations-logos/Whatsapp-Cloude.svg');
  });

  it('returns undefined for unmapped node types', () => {
    expect(getIntegrationLogo('unknown')).toBeUndefined();
    expect(getIntegrationLogo('google_tasks')).toBeUndefined();
  });
});
