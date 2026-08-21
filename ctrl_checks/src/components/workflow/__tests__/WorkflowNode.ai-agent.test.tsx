import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import WorkflowNode from '../WorkflowNode';

vi.mock('@xyflow/react', () => ({
  Handle: (props: any) => <div data-handle={props?.id || 'default'} data-type={props?.type} data-position={props?.position} />,
  Position: {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom',
  },
}));

vi.mock('@/stores/debugStore', () => ({
  useDebugStore: () => ({
    openDebug: vi.fn(),
  }),
}));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: 'light' as const,
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
  }),
}));

describe('WorkflowNode AI Agent ports', () => {
  it('renders canonical attachment and output handles', () => {
    const props: any = {
      id: 'agent_1',
      selected: false,
      data: {
        type: 'ai_agent',
        label: 'AI Agent',
        category: 'ai',
        icon: 'Bot',
        config: {},
      },
    };

    const html = renderToString(<WorkflowNode {...props} />);

    expect(html).toContain('data-handle="userInput"');
    expect(html).toContain('data-handle="input"');
    expect(html).toContain('data-handle="chat_model"');
    expect(html).toContain('data-handle="memory"');
    expect(html).toContain('data-handle="tool"');
    expect(html).toContain('data-handle="success"');
    expect(html).toContain('data-position="right"');
    expect(html).toContain('data-handle="error"');
    expect(html).toContain('data-handle="output"');
    expect(html).toContain('Reply');
    expect(html).toContain('Error');
  });

  it('renders placement controls for agent attachments', () => {
    const props: any = {
      id: 'agent_1',
      selected: false,
      data: {
        type: 'ai_agent',
        label: 'AI Agent',
        category: 'ai',
        icon: 'Bot',
        config: {},
      },
    };

    const html = renderToString(<WorkflowNode {...props} />);

    expect(html).toContain('Model');
    expect(html).toContain('Memory');
    expect(html).toContain('Tools');
    expect(html).toContain('Place');
  });

  it('renders attached tool nodes as compact circular source nodes', () => {
    const props: any = {
      id: 'google_sheets_1',
      selected: false,
      data: {
        type: 'google_sheets',
        label: 'Google Sheets',
        category: 'google',
        icon: 'Table',
        config: {},
        agentAttachmentRole: 'tool',
      },
    };

    const html = renderToString(<WorkflowNode {...props} />);

    expect(html).toContain('Google Sheets');
    expect(html).toContain('data-handle="output"');
    expect(html).not.toContain('data-handle="input"');
  });
});
