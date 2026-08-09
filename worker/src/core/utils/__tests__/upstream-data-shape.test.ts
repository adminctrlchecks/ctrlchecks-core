import { resolveUpstreamOutputFields } from '../upstream-data-shape';

describe('resolveUpstreamOutputFields', () => {
  const jobApplicationForm = {
    id: 'form1',
    type: 'form',
    data: {
      type: 'form',
      label: 'Job Application Form',
      config: {
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'email', label: 'Email', type: 'email', required: true },
          { key: 'phone', label: 'Phone', type: 'text', required: true },
          { key: 'resumeLink', label: 'Resume Link', type: 'url', required: true },
        ],
      },
    },
  };
  const sheets = { id: 'sheets1', type: 'custom', data: { type: 'google_sheets', label: 'Google Sheets' } };

  it('returns the form fields available to a directly-connected Google Sheets node', () => {
    const workflow = {
      nodes: [jobApplicationForm, sheets],
      edges: [{ source: 'form1', target: 'sheets1' }],
    };
    expect(resolveUpstreamOutputFields(workflow, 'sheets1')).toEqual(['name', 'email', 'phone', 'resumeLink']);
  });

  it('walks transitively through an intermediate node, nearest producers first', () => {
    const filter = { id: 'filter1', type: 'custom', data: { type: 'filter', label: 'Filter' } };
    const workflow = {
      nodes: [jobApplicationForm, filter, sheets],
      edges: [
        { source: 'form1', target: 'filter1' },
        { source: 'filter1', target: 'sheets1' },
      ],
    };
    // Form fields are still reachable upstream of the Sheets node.
    expect(resolveUpstreamOutputFields(workflow, 'sheets1')).toEqual(
      expect.arrayContaining(['name', 'email', 'phone', 'resumeLink']),
    );
  });

  it('returns [] for a node with nothing upstream', () => {
    const workflow = { nodes: [jobApplicationForm, sheets], edges: [{ source: 'form1', target: 'sheets1' }] };
    expect(resolveUpstreamOutputFields(workflow, 'form1')).toEqual([]);
  });
});
