import { isReservedControlVocabularyValue } from '../field-ownership';

describe('isReservedControlVocabularyValue', () => {
  it('flags a bare fill-mode/ownership label as suspicious', () => {
    expect(isReservedControlVocabularyValue(undefined, 'manual')).toBe(true);
    expect(isReservedControlVocabularyValue(undefined, 'manual_static')).toBe(true);
    expect(isReservedControlVocabularyValue(undefined, 'runtime_ai')).toBe(true);
    expect(isReservedControlVocabularyValue(undefined, 'buildtime_ai_once')).toBe(true);
    expect(isReservedControlVocabularyValue(undefined, 'credential')).toBe(true);
    expect(isReservedControlVocabularyValue(undefined, 'structural')).toBe(true);
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(isReservedControlVocabularyValue(undefined, '  Manual  ')).toBe(true);
    expect(isReservedControlVocabularyValue(undefined, 'AI')).toBe(true);
  });

  it('does not flag real content', () => {
    expect(isReservedControlVocabularyValue(undefined, 'support@example.com')).toBe(false);
    expect(isReservedControlVocabularyValue(undefined, 'Hello from CtrlChecks')).toBe(false);
    expect(isReservedControlVocabularyValue(undefined, '')).toBe(false);
    expect(isReservedControlVocabularyValue(undefined, 42)).toBe(false);
    expect(isReservedControlVocabularyValue(undefined, undefined)).toBe(false);
  });

  it('exempts a value that is a real declared option for that field', () => {
    const field = { ui: { options: [{ label: 'Manual', value: 'manual' }, { label: 'Auto', value: 'auto' }] } };
    expect(isReservedControlVocabularyValue(field, 'manual')).toBe(false);
    expect(isReservedControlVocabularyValue(field, 'credential')).toBe(true);
  });
});
