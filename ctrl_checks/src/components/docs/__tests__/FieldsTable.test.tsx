import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FieldsTable } from '../FieldsTable';

describe('FieldsTable', () => {
  it('renders field how-to guidance and notes in the docs UI', () => {
    const html = renderToString(
      <FieldsTable
        fields={[
          {
            name: 'Input Data',
            internalKey: 'inputData',
            type: 'json',
            required: false,
            description: 'Optional sample data for the manual run.',
            helpText: 'What this field means: Use workplace sample data.\nHow to use it later: Map {{$json.customerEmail}}.',
            example: '{"customerEmail":"maya@acme.com"}',
            notes: 'This is optional test data.',
          },
        ]}
      />,
    );

    expect(html).toContain('How to set');
    expect(html).toContain('Use workplace sample data');
    expect(html).toContain('Map {{$json.customerEmail}}');
    expect(html).toContain('This is optional test data.');
  });
});
