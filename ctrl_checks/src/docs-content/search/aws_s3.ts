import type { DocsSearchIndexItem } from '../search-index';

const fields = ['operation', 'region', 'accessKeyId', 'secretAccessKey', 'sessionToken', 'bucket', 'key', 'prefix', 'content', 'dataBase64', 'data'];
const operations = ['get', 'put', 'list', 'delete'];

export const awsS3SearchIndex = [
  {
    type: 'node',
    title: 'AWS S3',
    slug: 'aws_s3',
    category: 'File',
    href: '/docs/nodes/aws_s3',
    text: 'AWS S3 bucket object get put list delete download upload dataBase64 sizeBytes etag items prefix IAM access key secret session token region.',
  },
  ...operations.map((operation) => ({
    type: 'operation' as const,
    title: `AWS S3: ${operation}`,
    slug: 'aws_s3',
    category: 'File',
    href: `/docs/nodes/aws_s3#operation-${operation}`,
    text: `AWS S3 ${operation} object bucket key content dataBase64 list items delete uploaded _error.`,
  })),
  ...fields.map((field) => ({
    type: 'field' as const,
    title: `AWS S3: ${field}`,
    slug: 'aws_s3',
    category: 'File',
    href: '/docs/nodes/aws_s3',
    text: `AWS S3 field ${field} bucket object key upload download list credential workflow.`,
  })),
] satisfies DocsSearchIndexItem[];
