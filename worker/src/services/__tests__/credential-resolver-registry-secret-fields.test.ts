import { registrySecretFieldNamesForProvider } from '../credential-resolver';

describe('registrySecretFieldNamesForProvider', () => {
  it('finds Bitbucket App Password\'s actual secret field name (appPassword)', () => {
    // Regression test: the static CANONICAL_TOKEN_FIELD_CANDIDATES list in
    // credential-resolver.ts did not include "appPassword", so a correctly saved
    // Bitbucket connection permanently failed readiness with "runtime token is
    // missing" even though the credential existed and was valid. This must be
    // registry-driven so any credential type's real field name is found, not
    // guessed from a hand-maintained list.
    const fields = registrySecretFieldNamesForProvider('bitbucket');
    expect(fields).toContain('appPassword');
    expect(fields).not.toContain('username');
  });

  it('finds Mailgun\'s secret field name (apiKey)', () => {
    const fields = registrySecretFieldNamesForProvider('mailgun');
    expect(fields).toContain('apiKey');
  });

  it('excludes oauth2 credential definitions for the same provider', () => {
    // OAuth2 tokens live in unified_credentials, not the connections-table
    // fallback this helper feeds — including them here would be misleading and
    // could accidentally treat an unrelated field as a usable secret.
    const fields = registrySecretFieldNamesForProvider('google');
    expect(fields.length).toBe(0);
  });

  it('returns an empty array for an unknown provider', () => {
    expect(registrySecretFieldNamesForProvider('not_a_real_provider')).toEqual([]);
  });
});
