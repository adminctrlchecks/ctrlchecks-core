import type { DocsSearchIndexItem } from '../search-index';

export const jenkinsSearchIndex = [
  { type: 'node', title: 'Jenkins', slug: 'jenkins', category: 'DevOps', href: '/docs/nodes/jenkins', text: 'Jenkins registry override for build, status, and cancel operations. Output is success with output.operation, output.jobName, output.data or JENKINS_FAILED error.' },
  { type: 'operation', title: 'Jenkins: Build Job', slug: 'jenkins', category: 'DevOps', href: '/docs/nodes/jenkins#operation-build', text: 'Build triggers /build or /buildWithParameters depending on parameters object.' },
  { type: 'operation', title: 'Jenkins: Get Build Status', slug: 'jenkins', category: 'DevOps', href: '/docs/nodes/jenkins#operation-status', text: 'Status reads lastBuild or a specific buildNumber JSON from Jenkins.' },
  { type: 'operation', title: 'Jenkins: Cancel Build', slug: 'jenkins', category: 'DevOps', href: '/docs/nodes/jenkins#operation-cancel', text: 'Cancel stops a specific buildNumber and requires jobName plus buildNumber.' },
  { type: 'field', title: 'Jenkins: baseUrl', slug: 'jenkins', category: 'DevOps', href: '/docs/nodes/jenkins#field-baseUrl', text: 'Jenkins root URL. Runtime appends job path segments.' },
  { type: 'field', title: 'Jenkins: username', slug: 'jenkins', category: 'DevOps', href: '/docs/nodes/jenkins#field-username', text: 'Jenkins username for Basic Auth.' },
  { type: 'field', title: 'Jenkins: apiToken', slug: 'jenkins', category: 'DevOps', href: '/docs/nodes/jenkins#field-apiToken', text: 'Jenkins API token. Runtime reads apiToken, not token.' },
  { type: 'field', title: 'Jenkins: jobName', slug: 'jenkins', category: 'DevOps', href: '/docs/nodes/jenkins#field-jobName', text: 'Jenkins job name or folder/job path.' },
  { type: 'field', title: 'Jenkins: buildNumber', slug: 'jenkins', category: 'DevOps', href: '/docs/nodes/jenkins#field-buildNumber', text: 'Build number for status or cancel. Status uses lastBuild when blank.' },
  { type: 'field', title: 'Jenkins: parameters', slug: 'jenkins', category: 'DevOps', href: '/docs/nodes/jenkins#field-parameters', text: 'JSON object for parameterized builds sent to buildWithParameters.' },
] satisfies DocsSearchIndexItem[];
