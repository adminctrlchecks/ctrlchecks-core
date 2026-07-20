import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

export type BinaryStorageProvider = 'local';

export interface BinaryFileExecutionContext {
  db?: any;
  workflowId?: string;
  userId?: string;
  currentUserId?: string;
  nodeId?: string;
}

export interface BinaryFileMetadata {
  id: string;
  userId?: string | null;
  workflowId?: string | null;
  executionId?: string | null;
  nodeId?: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  storageProvider: BinaryStorageProvider;
  storageKey: string;
  visibility: 'private';
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BinaryWriteInput {
  fileName?: unknown;
  filePath?: unknown;
  folder?: unknown;
  mimeType?: unknown;
  persist?: unknown;
  expiresAt?: unknown;
  dataBase64?: unknown;
  data?: unknown;
  content?: unknown;
  fileData?: unknown;
  fileContent?: unknown;
  binary?: unknown;
  file?: unknown;
}

export interface BinaryReadInput {
  sourceType?: unknown;
  assetId?: unknown;
  filePath?: unknown;
  storageKey?: unknown;
  maxSize?: unknown;
}

export interface BinaryWriteResult {
  success: true;
  assetId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  storageProvider: BinaryStorageProvider;
  storageKey: string;
  filePath: string;
  dataBase64: string;
  metadataPersisted: boolean;
  metadataError?: string;
}

export interface BinaryReadResult {
  success: true;
  assetId?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  storageProvider: BinaryStorageProvider;
  storageKey: string;
  filePath: string;
  dataBase64: string;
}

const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

function storageRoot(): string {
  return path.resolve(process.env.BINARY_FILE_ROOT || path.join(os.tmpdir(), 'ctrlchecks-files'));
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  }
  return fallback;
}

function safeFileName(input: unknown): string {
  const raw = stringValue(input) || 'file.bin';
  const base = path.basename(raw).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base || 'file.bin';
}

function safeFolder(input: unknown): string {
  const raw = stringValue(input);
  if (!raw) return '';
  return raw
    .split(/[\\/]+/)
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, '_'))
    .filter(Boolean)
    .join(path.sep);
}

function inferMimeType(fileName: string, configured?: unknown): string {
  const explicit = stringValue(configured);
  if (explicit) return explicit;
  const ext = path.extname(fileName).toLowerCase();
  const byExt: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.html': 'text/html',
  };
  return byExt[ext] || 'application/octet-stream';
}

function normalizeDataUrl(value: string): { dataBase64: string; mimeType?: string } | null {
  const match = value.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.*)$/is);
  if (!match) return null;
  return {
    mimeType: match[1] || undefined,
    dataBase64: match[2].replace(/\s/g, ''),
  };
}

function looksLikeBase64(value: string): boolean {
  const normalized = value.replace(/\s/g, '');
  return normalized.length > 0 && normalized.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(normalized);
}

function parseDataPayload(input: BinaryWriteInput): { buffer: Buffer; dataBase64: string; mimeType?: string } {
  const candidates: unknown[] = [
    input.dataBase64,
    input.fileData,
    input.fileContent,
    input.data,
    input.content,
    input.binary,
    input.file,
    (input.data as any)?.dataBase64,
    (input.content as any)?.dataBase64,
    (input.file as any)?.dataBase64,
    (input.file as any)?.binary,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === '') continue;

    if (Buffer.isBuffer(candidate)) {
      return { buffer: candidate, dataBase64: candidate.toString('base64') };
    }
    if (candidate instanceof Uint8Array) {
      const buffer = Buffer.from(candidate);
      return { buffer, dataBase64: buffer.toString('base64') };
    }
    if (typeof candidate === 'object') {
      try {
        const nested = parseDataPayload(candidate as BinaryWriteInput);
        if (nested.buffer.length > 0) return nested;
      } catch {
        continue;
      }
      continue;
    }
    if (typeof candidate !== 'string') continue;

    const trimmed = candidate.trim();
    if (!trimmed) continue;

    const dataUrl = normalizeDataUrl(trimmed);
    if (dataUrl) {
      const buffer = Buffer.from(dataUrl.dataBase64, 'base64');
      return { buffer, dataBase64: buffer.toString('base64'), mimeType: dataUrl.mimeType };
    }

    const compact = trimmed.replace(/\s/g, '');
    if (looksLikeBase64(compact)) {
      const buffer = Buffer.from(compact, 'base64');
      return { buffer, dataBase64: buffer.toString('base64') };
    }

    const buffer = Buffer.from(trimmed, 'utf8');
    return { buffer, dataBase64: buffer.toString('base64') };
  }

  throw new Error('dataBase64, data, content, fileData, or fileContent is required');
}

function maxSizeBytes(input?: unknown): number {
  const parsed = Number(input);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_SIZE_BYTES;
}

function assertSize(buffer: Buffer, maxBytes: number): void {
  if (buffer.length > maxBytes) {
    throw new Error(`file size ${buffer.length} bytes exceeds maxSize ${maxBytes} bytes`);
  }
}

function resolveInsideRoot(relativeOrAbsolute: string): string {
  const root = storageRoot();
  const resolved = path.resolve(root, relativeOrAbsolute);
  const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    throw new Error(`unsafe file path outside binary storage root: ${relativeOrAbsolute}`);
  }
  return resolved;
}

function buildStorageKey(ctx: BinaryFileExecutionContext, folder: unknown, fileName: string): string {
  const owner = safeFolder(ctx.currentUserId || ctx.userId || 'anonymous');
  const workflow = safeFolder(ctx.workflowId || 'workflow');
  const node = safeFolder(ctx.nodeId || 'node');
  const explicitFolder = safeFolder(folder);
  const id = crypto.randomUUID();
  const parts = ['users', owner, 'workflows', workflow, 'nodes', node];
  if (explicitFolder) parts.push(explicitFolder);
  parts.push(`${id}-${fileName}`);
  return parts.join(path.sep);
}

async function persistMetadata(ctx: BinaryFileExecutionContext, metadata: BinaryFileMetadata): Promise<{ persisted: boolean; error?: string }> {
  if (!ctx.db?.from) return { persisted: false, error: 'database client unavailable' };

  const row = {
    id: metadata.id,
    user_id: isUuid(ctx.currentUserId) ? ctx.currentUserId : (isUuid(ctx.userId) ? ctx.userId : null),
    workflow_id: isUuid(ctx.workflowId) ? ctx.workflowId : null,
    execution_id: isUuid(metadata.executionId) ? metadata.executionId : null,
    node_id: metadata.nodeId || null,
    file_name: metadata.fileName,
    mime_type: metadata.mimeType,
    size_bytes: metadata.sizeBytes,
    checksum_sha256: metadata.checksumSha256,
    storage_provider: metadata.storageProvider,
    storage_key: metadata.storageKey,
    visibility: metadata.visibility,
    expires_at: metadata.expiresAt || null,
  };

  try {
    const result = await ctx.db.from('workflow_file_assets').insert(row);
    if (result?.error) return { persisted: false, error: result.error.message || String(result.error) };
    return { persisted: true };
  } catch (error: any) {
    return { persisted: false, error: error?.message || String(error) };
  }
}

async function findAsset(ctx: BinaryFileExecutionContext, assetId: string): Promise<BinaryFileMetadata | null> {
  if (!ctx.db?.from) throw new Error('database client unavailable for assetId lookup');
  const query = ctx.db
    .from('workflow_file_assets')
    .select('*')
    .eq('id', assetId);
  const result = typeof query.single === 'function' ? await query.single() : await query;
  if (result?.error) throw new Error(result.error.message || String(result.error));
  const row = result?.data;
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    workflowId: row.workflow_id,
    executionId: row.execution_id,
    nodeId: row.node_id,
    fileName: row.file_name,
    mimeType: row.mime_type || 'application/octet-stream',
    sizeBytes: Number(row.size_bytes || 0),
    checksumSha256: row.checksum_sha256 || '',
    storageProvider: row.storage_provider || 'local',
    storageKey: row.storage_key,
    visibility: row.visibility || 'private',
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function writeBinaryFileAsset(
  input: BinaryWriteInput,
  ctx: BinaryFileExecutionContext = {},
): Promise<BinaryWriteResult> {
  const parsed = parseDataPayload(input);
  assertSize(parsed.buffer, maxSizeBytes((input as any).maxSize));

  const fileName = safeFileName(input.fileName || input.filePath);
  const mimeType = parsed.mimeType || inferMimeType(fileName, input.mimeType);
  const storageKey = stringValue(input.filePath)
    ? safeFolder(input.filePath)
    : buildStorageKey(ctx, input.folder, fileName);
  const filePath = resolveInsideRoot(storageKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, parsed.buffer);

  const checksumSha256 = crypto.createHash('sha256').update(parsed.buffer).digest('hex');
  const metadata: BinaryFileMetadata = {
    id: crypto.randomUUID(),
    userId: ctx.currentUserId || ctx.userId || null,
    workflowId: ctx.workflowId || null,
    nodeId: ctx.nodeId || null,
    fileName,
    mimeType,
    sizeBytes: parsed.buffer.length,
    checksumSha256,
    storageProvider: 'local',
    storageKey,
    visibility: 'private',
    expiresAt: stringValue(input.expiresAt) || null,
  };

  const shouldPersist = booleanValue(input.persist, true);
  const persisted = shouldPersist ? await persistMetadata(ctx, metadata) : { persisted: false };

  return {
    success: true,
    assetId: metadata.id,
    fileName,
    mimeType,
    sizeBytes: parsed.buffer.length,
    checksumSha256,
    storageProvider: 'local',
    storageKey,
    filePath,
    dataBase64: parsed.dataBase64,
    metadataPersisted: persisted.persisted,
    metadataError: persisted.error,
  };
}

export async function readBinaryFileAsset(
  input: BinaryReadInput,
  ctx: BinaryFileExecutionContext = {},
): Promise<BinaryReadResult> {
  const sourceType = stringValue(input.sourceType) || (stringValue(input.assetId) ? 'assetId' : 'serverPath');
  const maxBytes = maxSizeBytes(input.maxSize);

  let asset: BinaryFileMetadata | null = null;
  let storageKey = stringValue(input.storageKey);
  let fileName = '';
  let mimeType = 'application/octet-stream';
  let assetId: string | undefined;

  if (sourceType === 'assetId') {
    assetId = stringValue(input.assetId);
    if (!assetId) throw new Error('assetId is required when sourceType is assetId');
    asset = await findAsset(ctx, assetId);
    if (!asset) throw new Error(`file asset not found: ${assetId}`);
    storageKey = asset.storageKey;
    fileName = asset.fileName;
    mimeType = asset.mimeType;
  } else {
    const filePath = stringValue(input.filePath);
    if (!filePath && !storageKey) throw new Error('filePath or storageKey is required');
    storageKey = storageKey || safeFolder(filePath);
    fileName = safeFileName(filePath || storageKey);
    mimeType = inferMimeType(fileName);
  }

  const filePath = resolveInsideRoot(storageKey);
  const buffer = await fs.readFile(filePath);
  assertSize(buffer, maxBytes);
  const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');

  return {
    success: true,
    assetId,
    fileName,
    mimeType,
    sizeBytes: buffer.length,
    checksumSha256,
    storageProvider: 'local',
    storageKey,
    filePath,
    dataBase64: buffer.toString('base64'),
  };
}

export function getBinaryFileStorageRoot(): string {
  return storageRoot();
}
