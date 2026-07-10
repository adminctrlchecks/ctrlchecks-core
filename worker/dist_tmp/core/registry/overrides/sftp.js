"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideSftp = overrideSftp;
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
function overrideSftp(def, _schema) {
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
        port: { type: 'number', description: 'SFTP port', required: false, default: 22, role: 'config', fillMode: manualStatic },
        username: {
            type: 'string',
            description: 'SFTP username',
            required: true,
            ownership: 'credential',
            role: 'config',
            helpCategory: 'generic_credential',
            fillMode: manualStatic,
        },
        password: {
            type: 'string',
            description: 'SFTP password. Required unless privateKey is provided.',
            required: false,
            ownership: 'credential',
            role: 'config',
            helpCategory: 'generic_credential',
            fillMode: manualStatic,
        },
        privateKey: {
            type: 'string',
            description: 'SFTP SSH private key. Required unless password is provided.',
            required: false,
            ownership: 'credential',
            role: 'config',
            helpCategory: 'generic_credential',
            fillMode: manualStatic,
        },
        passphrase: {
            type: 'string',
            description: 'Passphrase for encrypted SSH private keys',
            required: false,
            ownership: 'credential',
            role: 'config',
            helpCategory: 'generic_credential',
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
        requiredInputs: Array.from(new Set([...(def.requiredInputs || []), 'host', 'username'])),
        credentialSchema: {
            requirements: [{ provider: 'sftp', category: 'credential', required: true, description: 'SFTP password or SSH private key' }],
            credentialFields: ['username', 'password', 'privateKey', 'passphrase'],
        },
        execute: async (context) => {
            const inputs = (0, http_integration_utils_1.mergeContextInputs)(context);
            const operation = String(inputs.operation || 'list');
            const SftpClient = require('ssh2-sftp-client');
            const client = new SftpClient();
            try {
                const host = String(inputs.host || '').trim();
                const username = String(inputs.username || '').trim();
                const password = String(inputs.password || '');
                const privateKey = String(inputs.privateKey || '');
                if (!host)
                    throw new Error('host is required');
                if (!username)
                    throw new Error('username is required');
                if (!password && !privateKey)
                    throw new Error('password or privateKey is required');
                await client.connect({
                    host,
                    port: Number(inputs.port || 22),
                    username,
                    ...(password ? { password } : {}),
                    ...(privateKey ? { privateKey, passphrase: inputs.passphrase || undefined } : {}),
                });
                const remotePath = String(inputs.path || '.');
                let output;
                if (operation === 'list') {
                    output = await client.list(remotePath);
                }
                else if (operation === 'download') {
                    if (!inputs.path)
                        throw new Error('path is required for download');
                    const payload = await client.get(remotePath);
                    const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
                    output = { path: remotePath, size: buffer.length, dataBase64: buffer.toString('base64') };
                }
                else if (operation === 'upload') {
                    if (!inputs.path)
                        throw new Error('path is required for upload');
                    const buffer = toBuffer(inputs.fileData);
                    if (buffer.length === 0)
                        throw new Error('fileData is required for upload');
                    await client.put(buffer, remotePath);
                    output = { path: remotePath, size: buffer.length, uploaded: true };
                }
                else {
                    throw new Error(`Unsupported SFTP operation: ${operation}`);
                }
                return { success: true, output: { operation, data: output } };
            }
            catch (error) {
                return { success: false, error: { code: 'SFTP_FAILED', message: error?.message || 'SFTP operation failed' } };
            }
            finally {
                await client.end().catch(() => undefined);
            }
        },
    };
}
