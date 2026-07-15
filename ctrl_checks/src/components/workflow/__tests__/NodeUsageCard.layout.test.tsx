/**
 * NodeUsageCard Layout Contract Tests
 *
 * The card lives inside the 360px Properties panel: it must never allow
 * horizontal overflow, tips/overview must wrap, and the example area must be
 * vertically bounded.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import NodeUsageCard from '../NodeUsageCard';
import type { NodeUsageGuide } from '../nodeTypes';

const LONG_TIP =
  'Use search to filter messages before getting details and remember that message identifiers are returned when listing or searching so downstream nodes can reference them without re-querying the mailbox every single time';

const guide: NodeUsageGuide = {
  overview:
    'Send, list, get, or search Gmail messages. Automate email operations in your workflows with a connected Google account and schema-driven inputs.',
  inputs: ['operation', 'a_very_long_input_field_name_that_should_truncate_inside_its_badge'],
  outputs: ['messageId', 'threadId'],
  example: `Operation: "send"\nTo: "user@example.com"\nSubject: "Weekly report"\n${'x'.repeat(400)}`,
  tips: [LONG_TIP, 'Short tip'],
};

describe('NodeUsageCard layout contract', () => {
  it('renders inside an overflow-hidden, width-bounded card', () => {
    render(<NodeUsageCard guide={guide} nodeLabel="Gmail" />);
    const card = screen.getByTestId('node-usage-card');
    expect(card.className).toContain('min-w-0');
    expect(card.className).toContain('max-w-full');
    expect(card.className).toContain('overflow-hidden');
  });

  it('renders long tips wrapped in min-w-0 break-words containers', () => {
    render(<NodeUsageCard guide={guide} nodeLabel="Gmail" />);
    const tip = screen.getByText(LONG_TIP);
    expect(tip.className).toContain('min-w-0');
    expect(tip.className).toContain('break-words');
  });

  it('keeps all three tabs available without overflowing labels', () => {
    render(<NodeUsageCard guide={guide} nodeLabel="Gmail" />);
    for (const label of ['Overview', 'I/O', 'Example']) {
      const tab = screen.getByRole('tab', { name: label });
      expect(tab.className).toContain('min-w-0');
      expect(tab.className).toContain('truncate');
    }
  });

  it('wraps the overview text instead of clipping it', () => {
    render(<NodeUsageCard guide={guide} nodeLabel="Gmail" />);
    const overview = screen.getByText(/Send, list, get, or search Gmail messages/);
    expect(overview.className).toContain('break-words');
  });
});
