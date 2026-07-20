import type { DocsSearchIndexItem } from '../search-index';

export const clickupSearchIndex = [
  {
    type: 'node',
    title: 'ClickUp',
    slug: 'clickup',
    category: 'Productivity',
    href: '/docs/nodes/clickup',
    text: 'ClickUp creates, updates, reads, deletes, comments on, and discovers tasks, lists, folders, spaces, and teams. Output is raw ClickUp data; invalid status retry can add _statusSkipped and _statusNote.',
  },
  {
    type: 'operation',
    title: 'ClickUp: Tasks and Discovery',
    slug: 'clickup',
    category: 'Productivity',
    href: '/docs/nodes/clickup#operation-create_task',
    text: 'Operations: create_task update_task get_task delete_task list_tasks add_comment update_status get_teams get_spaces get_folders get_lists. Fields include workspaceId spaceId folderId listId taskId name description status priority assignees dueDate commentText includeClosed.',
  },
  {
    type: 'field',
    title: 'ClickUp: Credentials and IDs',
    slug: 'clickup',
    category: 'Productivity',
    href: '/docs/nodes/clickup#operation-create_task',
    text: 'Use ClickUp Connections or credential vault for apiKey apiToken token. Use Get Teams, Get Spaces, Get Folders, and Get Lists to discover workspaceId, spaceId, folderId, and listId.',
  },
] satisfies DocsSearchIndexItem[];
