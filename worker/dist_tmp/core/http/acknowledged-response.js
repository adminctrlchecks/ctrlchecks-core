"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readAcknowledgedHttpResponse = readAcknowledgedHttpResponse;
exports.extractProviderErrorMessage = extractProviderErrorMessage;
function isTextLikeContentType(contentType) {
    const normalized = contentType.toLowerCase();
    return (normalized.includes('application/json') ||
        normalized.includes('+json') ||
        normalized.startsWith('text/') ||
        normalized.includes('application/xml') ||
        normalized.includes('application/x-www-form-urlencoded'));
}
function isJsonContentType(contentType) {
    const normalized = contentType.toLowerCase();
    return normalized.includes('application/json') || normalized.includes('+json');
}
function truncateRawText(value, maxLength) {
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}
async function readAcknowledgedHttpResponse(response, options = {}) {
    const contentType = response.headers.get('content-type') || '';
    const contentLength = response.headers.get('content-length');
    const maxRawTextLength = options.maxRawTextLength ?? 2000;
    const operationStatus = response.ok ? 'succeeded' : 'failed';
    const emptyResult = () => ({
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType,
        operationStatus,
        acknowledgementStatus: response.ok ? 'empty_success' : 'not_required',
        data: null,
        empty: true,
    });
    if (response.status === 204 || response.status === 205 || contentLength === '0') {
        return emptyResult();
    }
    if (options.binaryForNonText && contentType && !isTextLikeContentType(contentType)) {
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length === 0)
            return emptyResult();
        return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            contentType,
            operationStatus,
            acknowledgementStatus: 'not_required',
            data: {
                contentType,
                dataBase64: buffer.toString('base64'),
                size: buffer.length,
            },
            empty: false,
        };
    }
    const text = await response.text();
    if (!text.trim()) {
        return emptyResult();
    }
    if (isJsonContentType(contentType)) {
        try {
            return {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                contentType,
                operationStatus,
                acknowledgementStatus: 'parsed',
                data: JSON.parse(text),
                rawText: truncateRawText(text, maxRawTextLength),
                empty: false,
            };
        }
        catch (error) {
            return {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                contentType,
                operationStatus: response.ok ? 'unknown' : 'failed',
                acknowledgementStatus: 'parse_failed',
                data: text,
                rawText: truncateRawText(text, maxRawTextLength),
                parseError: error?.message || 'Failed to parse JSON response',
                empty: false,
            };
        }
    }
    return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType,
        operationStatus,
        acknowledgementStatus: 'not_required',
        data: text,
        rawText: truncateRawText(text, maxRawTextLength),
        empty: false,
    };
}
function extractProviderErrorMessage(parsed, fallbackPrefix = 'HTTP') {
    const payload = parsed.data;
    return (payload?.error?.message ||
        payload?.message ||
        payload?.detail ||
        payload?.errors?.[0]?.message ||
        (typeof payload === 'string' ? payload : '') ||
        `${fallbackPrefix} ${parsed.status}`);
}
