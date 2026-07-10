"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideFtp = overrideFtp;
const stream_1 = require("stream");
const http_integration_utils_1 = require("./http-integration-utils");
function toBuffer(value) {
    const raw = String(value || '');
    if (!raw)
        return Buffer.alloc(0);
    if (raw.startsWith('data:')) {
        return Buffer.from(raw.split(',')[1] || '', 'base64');
    }
    return Buffer.from(raw, /^[A-Za-z0-9+/]+={0,2}$/.test(raw) ? 'base64' : 'utf8');
}
function createDownloadSink(chunks) {
    return new stream_1.Writable({
        write(chunk, _encoding, callback) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            callback();
        },
    });
}
function overrideFtp(def, _schema) {
    const manualStatic = { default: 'manual_static', supportsRuntimeAI: false, supportsBuildtimeAI: false };
    const operationOptions = ['upload', 'download', 'list'].map((value) => ({
        label: value.charAt(0).toUpperCase() + value.slice(1),
        value,
    }));
    const inputSchema = {
        ...def.inputSchema,
        operation: {
            ...def.inputSchema.operation,
            ui: { ...(def.inputSchema.operation?.ui || {}), options: operationOptions },
        },
        host: { ...def.inputSchema.host, required: true, role: 'config' },
        port: { type: 'number', description: 'FTP port', required: false, default: 21, role: 'config', fillMode: manualStatic },
        username: {
            type: 'string',
            description: 'FTP username',
            required: true,
            ownership: 'credential',
            role: 'config',
            helpCategory: 'generic_credential',
            fillMode: manualStatic,
        },
        password: {
            type: 'string',
            description: 'FTP password',
            required: true,
            ownership: 'credential',
            role: 'config',
            helpCategory: 'generic_credential',
            fillMode: manualStatic,
        },
        secure: {
            type: 'boolean',
            description: 'Use explicit FTPS/TLS',
            required: false,
            default: false,
            role: 'config',
            fillMode: manualStatic,
        },
        path: { ...def.inputSchema.path, required: false, role: 'id' },
        fileData: {
            type: 'string',
            description: 'File content for upload. Supports plain text, base64, or data URL payloads.',
            required: false,
            role: 'content',
            fillMode: { default: 'manual_static', supportsRuntimeAI: true, supportsBuildtimeAI: true },
        },
    };
    return {
        ...def,
        inputSchema,
        requiredInputs: Array.from(new Set([...(def.requiredInputs || []), 'host', 'username', 'password'])),
        credentialSchema: {
            requirements: [{ provider: 'ftp', category: 'basic_auth', required: true, description: 'FTP username and password' }],
            credentialFields: ['username', 'password'],
        },
        execute: async (context) => {
            const inputs = (0, http_integration_utils_1.mergeContextInputs)(context);
            const operation = String(inputs.operation || 'list');
            const { Client } = require('basic-ftp');
            const client = new Client();
            try {
                const host = String(inputs.host || '').trim();
                const username = String(inputs.username || '').trim();
                const password = String(inputs.password || '');
                if (!host)
                    throw new Error('host is required');
                if (!username)
                    throw new Error('username is required');
                if (!password)
                    throw new Error('password is required');
                await client.access({
                    host,
                    port: Number(inputs.port || 21),
                    user: username,
                    password,
                    secure: Boolean(inputs.secure),
                });
                const remotePath = String(inputs.path || '.');
                let output;
                if (operation === 'list') {
                    output = await client.list(remotePath);
                }
                else if (operation === 'download') {
                    if (!inputs.path)
                        throw new Error('path is required for download');
                    const chunks = [];
                    await client.downloadTo(createDownloadSink(chunks), remotePath);
                    const buffer = Buffer.concat(chunks);
                    output = { path: remotePath, size: buffer.length, dataBase64: buffer.toString('base64') };
                }
                else if (operation === 'upload') {
                    if (!inputs.path)
                        throw new Error('path is required for upload');
                    const buffer = toBuffer(inputs.fileData);
                    if (buffer.length === 0)
                        throw new Error('fileData is required for upload');
                    await client.uploadFrom(stream_1.Readable.from(buffer), remotePath);
                    output = { path: remotePath, size: buffer.length, uploaded: true };
                }
                else {
                    throw new Error(`Unsupported FTP operation: ${operation}`);
                }
                return { success: true, output: { operation, data: output } };
            }
            catch (error) {
                return { success: false, error: { code: 'FTP_FAILED', message: error?.message || 'FTP operation failed' } };
            }
            finally {
                client.close();
            }
        },
    };
}
