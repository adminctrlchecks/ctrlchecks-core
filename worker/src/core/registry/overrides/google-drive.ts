import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';
import { getGoogleTokenForContext, googleApiRequest, mergedInputs } from './google-workspace-utils';

function stringInput(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeUploadPayload(inputs: Record<string, any>): { rawData: string; mimeType?: string } {
  const candidates = [
    inputs.fileData,
    inputs.fileContent,
    inputs.dataBase64,
    inputs.data?.dataBase64,
    inputs.content?.dataBase64,
    inputs.data,
    inputs.content,
  ];
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    if (Buffer.isBuffer(candidate)) return { rawData: candidate.toString('base64') };
    if (candidate instanceof Uint8Array) return { rawData: Buffer.from(candidate).toString('base64') };
    if (typeof candidate === 'object') {
      const nested = normalizeUploadPayload(candidate);
      if (nested.rawData) return nested;
      continue;
    }
    const raw = stringInput(candidate);
    if (!raw) continue;
    const dataUrl = raw.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.*)$/is);
    if (dataUrl) return { rawData: dataUrl[2], mimeType: dataUrl[1] || undefined };
    return { rawData: raw };
  }
  return { rawData: '' };
}

function bufferFromPayload(rawData: string): Buffer {
  const compact = rawData.replace(/\s/g, '');
  const isLikelyBase64 = compact.length > 0 && compact.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(compact);
  return Buffer.from(isLikelyBase64 ? compact : rawData, isLikelyBase64 ? 'base64' : 'utf8');
}

export function overrideGoogleDrive(
  def: UnifiedNodeDefinition,
  _schema: NodeSchema,
): UnifiedNodeDefinition {
  const operationOptions = ['list', 'download', 'upload'].map((value) => ({
    label: value.charAt(0).toUpperCase() + value.slice(1),
    value,
  }));
  const inputSchema = {
    ...def.inputSchema,
    operation: {
      ...def.inputSchema.operation,
      ui: { ...(def.inputSchema.operation?.ui || {}), options: operationOptions },
    },
    fileData: {
      type: 'string' as const,
      description: 'File content for upload. Supports plain text, base64, or data URL payloads.',
      required: false,
      ownership: 'value' as const,
      role: 'content' as const,
      fillMode: { default: 'manual_static' as const, supportsRuntimeAI: true, supportsBuildtimeAI: true },
    },
    fileContent: {
      type: 'string' as const,
      description: 'Legacy alias for fileData.',
      required: false,
      ownership: 'value' as const,
      role: 'content' as const,
      aliasOf: 'fileData',
      fillMode: { default: 'manual_static' as const, supportsRuntimeAI: true, supportsBuildtimeAI: true },
    },
    dataBase64: {
      type: 'string' as const,
      description: 'Base64 file content for upload.',
      required: false,
      ownership: 'value' as const,
      role: 'content' as const,
      aliasOf: 'fileData',
      fillMode: { default: 'manual_static' as const, supportsRuntimeAI: true, supportsBuildtimeAI: true },
    },
    mimeType: {
      type: 'string' as const,
      description: 'MIME type for uploaded file',
      required: false,
      default: 'application/octet-stream',
      ownership: 'value' as const,
      role: 'config' as const,
      fillMode: { default: 'manual_static' as const, supportsRuntimeAI: false, supportsBuildtimeAI: false },
    },
    folderId: {
      type: 'string' as const,
      description: 'Optional parent folder ID for uploads/lists',
      required: false,
      ownership: 'value' as const,
      role: 'id' as const,
      fillMode: { default: 'manual_static' as const, supportsRuntimeAI: false, supportsBuildtimeAI: false },
    },
  };

  return {
    ...def,
    inputSchema,
    credentialSchema: {
      requirements: [{ provider: 'google', category: 'oauth', required: true, description: 'Google OAuth with Drive scope' }],
      credentialFields: ['accessToken'],
    },
    execute: async (context) => {
      const inputs = mergedInputs(context);
      const operation = String(inputs.operation || 'list');
      try {
        const accessToken = await getGoogleTokenForContext(context, ['https://www.googleapis.com/auth/drive']);
        let output: any;
        if (operation === 'list') {
          const query = inputs.folderId ? `'${String(inputs.folderId).replace(/'/g, "\\'")}' in parents` : undefined;
          const params = new URLSearchParams({
            pageSize: String(inputs.pageSize || 100),
            fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink)',
            ...(query ? { q: query } : {}),
          });
          output = await googleApiRequest(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, accessToken);
        } else if (operation === 'download') {
          const fileId = String(inputs.fileId || '').trim();
          if (!fileId) throw new Error('fileId is required for download');
          const metadata = await googleApiRequest(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,webViewLink,modifiedTime`,
            accessToken,
          );
          const downloaded = await googleApiRequest(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, accessToken);
          const binaryPayload = downloaded && typeof downloaded === 'object' && 'dataBase64' in downloaded
            ? downloaded as Record<string, any>
            : null;
          output = {
            fileId,
            id: fileId,
            fileName: metadata?.name,
            name: metadata?.name,
            mimeType: metadata?.mimeType || binaryPayload?.contentType || 'application/octet-stream',
            sizeBytes: Number(metadata?.size || binaryPayload?.size || 0) || undefined,
            size: Number(metadata?.size || binaryPayload?.size || 0) || undefined,
            webViewLink: metadata?.webViewLink,
            modifiedTime: metadata?.modifiedTime,
            ...(binaryPayload
              ? { dataBase64: binaryPayload.dataBase64 }
              : { content: downloaded }),
          };
        } else if (operation === 'upload') {
          const fileName = String(inputs.fileName || '').trim();
          if (!fileName) throw new Error('fileName is required for upload');
          const payload = normalizeUploadPayload(inputs);
          const rawData = payload.rawData;
          if (!rawData) throw new Error('fileData is required for upload');
          const mimeType = String(inputs.mimeType || payload.mimeType || 'application/octet-stream');
          const data = bufferFromPayload(rawData);
          const boundary = `ctrlchecks_${Date.now()}`;
          const metadata: Record<string, any> = { name: fileName };
          if (inputs.folderId) metadata.parents = [String(inputs.folderId)];
          const body = Buffer.concat([
            Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
            Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
            data,
            Buffer.from(`\r\n--${boundary}--`),
          ]);
          output = await googleApiRequest('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink', accessToken, {
            method: 'POST',
            headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
            body,
          });
          output = {
            fileId: output?.id,
            id: output?.id,
            fileName: output?.name,
            name: output?.name,
            mimeType: output?.mimeType || mimeType,
            sizeBytes: Number(output?.size || data.length),
            size: Number(output?.size || data.length),
            webViewLink: output?.webViewLink,
          };
        } else {
          throw new Error(`Unsupported Google Drive operation: ${operation}`);
        }
        return { success: true, output: { operation, data: output, ...output } };
      } catch (error: any) {
        return { success: false, error: { code: 'GOOGLE_DRIVE_FAILED', message: error?.message || 'Google Drive operation failed' } };
      }
    },
  };
}
