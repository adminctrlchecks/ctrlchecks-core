import type { DocsSearchIndexItem } from '../search-index';

export const scheduleSearchIndex = [
  {
    type: 'node',
    title: 'Schedule Trigger',
    slug: 'schedule',
    category: 'Triggers',
    href: '/docs/nodes/schedule',
    text: 'Schedule Trigger Start a workflow automatically at a planned time. Use it for daily reports, recurring reminders, morning checks, weekly exports, and other work that should run without someone pressing Run. Triggers',
  },
  {
    type: 'operation',
    title: 'Schedule Trigger: Execute',
    slug: 'schedule',
    category: 'Triggers',
    href: '/docs/nodes/schedule#operation-default',
    text: 'Schedule Trigger Execute Starts the workflow automatically whenever the schedule matches. Use the daily time picker for once-a-day tasks or cron for weekly, monthly, hourly, and business-day patterns.',
  },
  {
    type: 'field',
    title: 'Schedule Trigger: Cron',
    slug: 'schedule',
    category: 'Triggers',
    href: '/docs/nodes/schedule#operation-default',
    text: 'Schedule Trigger Cron cron Advanced schedule rule such as 0 9 * * * for every day at 9:00 or 0 9 * * 1-5 for weekdays at 9:00.',
  },
  {
    type: 'field',
    title: 'Schedule Trigger: Time',
    slug: 'schedule',
    category: 'Triggers',
    href: '/docs/nodes/schedule#operation-default',
    text: 'Schedule Trigger Time time Simple daily time in HH:MM format, such as 09:00 or 14:30, interpreted in the selected timezone.',
  },
  {
    type: 'field',
    title: 'Schedule Trigger: Timezone',
    slug: 'schedule',
    category: 'Triggers',
    href: '/docs/nodes/schedule#operation-default',
    text: 'Schedule Trigger Timezone timezone Business timezone used to interpret the schedule, with options for UTC, US timezones, Europe, India, Asia, Australia, and Dubai.',
  },
] satisfies DocsSearchIndexItem[];
