import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OutputPanel from './OutputPanel';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('OutputPanel readiness fallback', () => {
  it('renders plain string configuration errors as guided status instead of a red destructive panel', () => {
    const { container } = render(
      <OutputPanel
        status="error"
        error="This node needs configuration before it can run."
        outputData={undefined}
      />,
    );

    expect(screen.getByText('Configuration needs one more step')).toBeTruthy();
    expect(screen.getByText('Technical details')).toBeTruthy();
    expect(container.innerHTML).not.toContain('bg-destructive/10');
    expect(container.innerHTML).not.toContain('text-destructive');
  });
});
