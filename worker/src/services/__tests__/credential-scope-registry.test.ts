import {
  credentialRequirementForNode,
  normalizeProvider,
  requiredScopesForProvider,
  scopesCover,
  scopeSet,
  splitScopeSet,
} from '../credential-scope-registry';

describe('credential-scope-registry', () => {
  it('normalizes provider aliases used by node types', () => {
    expect(normalizeProvider(' google_gmail ')).toBe('google');
    expect(normalizeProvider('GOOGLE_BIG_QUERY')).toBe('google');
    expect(normalizeProvider('outlook')).toBe('microsoft');
    expect(normalizeProvider('custom_provider')).toBe('custom_provider');
  });

  it('canonicalizes scope sets by trimming, deduping, and sorting', () => {
    expect(scopeSet(['profile', ' email ', '', 'profile', 'openid'])).toBe('email+openid+profile');
    expect(scopeSet(['', '   '])).toBe('default');
  });

  it('splits stored scope sets back into trimmed scope arrays', () => {
    expect(splitScopeSet(null)).toEqual([]);
    expect(splitScopeSet('default')).toEqual([]);
    expect(splitScopeSet(' email + profile + ')).toEqual(['email', 'profile']);
  });

  it('checks whether available scopes cover all required scopes exactly', () => {
    expect(scopesCover(['email', 'profile', 'openid'], ['openid', 'email'])).toBe(true);
    expect(scopesCover(['email'], ['email', 'profile'])).toBe(false);
  });

  it('treats a broad Google scope as covering its .readonly sibling', () => {
    const SHEETS = 'https://www.googleapis.com/auth/spreadsheets';
    const SHEETS_RO = 'https://www.googleapis.com/auth/spreadsheets.readonly';
    const DRIVE = 'https://www.googleapis.com/auth/drive';
    const DRIVE_RO = 'https://www.googleapis.com/auth/drive.readonly';
    // The exact failing case: a connection granted full `spreadsheets` must satisfy a Sheets read.
    expect(scopesCover([SHEETS], [SHEETS_RO])).toBe(true);
    expect(scopesCover([DRIVE], [DRIVE_RO])).toBe(true);
  });

  it('does NOT treat a narrow scope as covering the broad one', () => {
    const SHEETS = 'https://www.googleapis.com/auth/spreadsheets';
    const SHEETS_RO = 'https://www.googleapis.com/auth/spreadsheets.readonly';
    // Implication is one-directional: read-only must never satisfy a write requirement.
    expect(scopesCover([SHEETS_RO], [SHEETS])).toBe(false);
  });

  it('prefers explicit scopes and dedupes them before provider defaults', () => {
    expect(requiredScopesForProvider('google_gmail', ['gmail.send', 'gmail.send', 'gmail.read'])).toEqual([
      'gmail.send',
      'gmail.read',
    ]);
  });

  it('derives credential requirements from known node type aliases', () => {
    const gmailRequirement = credentialRequirementForNode(' GOOGLE_GMAIL ');

    expect(gmailRequirement).toEqual({
      provider: 'google',
      requiredScopes: expect.arrayContaining([
        'https://www.googleapis.com/auth/gmail.send',
      ]),
    });

    expect(credentialRequirementForNode('unknown_node')).toBeNull();
  });
});
