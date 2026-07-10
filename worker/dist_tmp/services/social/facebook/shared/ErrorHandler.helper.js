"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookNotYetImplementedError = void 0;
exports.mapFacebookError = mapFacebookError;
exports.toFacebookErrorPayload = toFacebookErrorPayload;
const axios_1 = require("axios");
const FACEBOOK_ERROR_MAP = {
    190: {
        message: 'Access token expired. Re-authenticate with Facebook.',
        hint: 'Reconnect OAuth',
    },
    200: {
        message: 'Permission error. Missing scope or role for this action.',
        hint: 'Regrant permission',
    },
    100: {
        message: 'Invalid parameter in Facebook request.',
        hint: 'Check input fields',
    },
    4: {
        message: 'Rate limit exceeded. Request will be retried with backoff.',
        hint: 'Implement retry logic',
    },
    10: {
        message: 'Application does not have permission for this action.',
        hint: 'Check page roles',
    },
    17: {
        message: 'User request limit reached.',
        hint: 'Reduce batch size',
    },
    368: {
        message: 'Temporarily blocked for suspicious activity.',
        hint: 'Contact Facebook support',
    },
    80001: {
        message: 'Video file too large for Facebook upload.',
        hint: 'Compress video',
    },
    80004: {
        message: 'Invalid video format. Supported: MP4, MOV, AVI.',
        hint: 'Convert format',
    },
};
function mapFacebookError(errorCode) {
    if (!errorCode)
        return null;
    return FACEBOOK_ERROR_MAP[errorCode] || null;
}
function toFacebookErrorPayload(error) {
    if (error instanceof axios_1.AxiosError) {
        const statusCode = error.response?.status;
        const fb = error.response?.data?.error;
        const mapped = mapFacebookError(fb?.code);
        return {
            message: mapped?.message || fb?.message || error.message,
            statusCode,
            code: fb?.code,
            type: fb?.type,
            errorSubcode: fb?.error_subcode,
            hint: mapped?.hint,
        };
    }
    if (error instanceof Error) {
        return { message: error.message };
    }
    return { message: 'Unknown Facebook error occurred' };
}
class FacebookNotYetImplementedError extends Error {
    constructor(resource, operation, eta = '2026-05-15') {
        super(`Not yet implemented: ${resource}.${operation}. Expected completion date: ${eta}.`);
        this.name = 'FacebookNotYetImplementedError';
    }
}
exports.FacebookNotYetImplementedError = FacebookNotYetImplementedError;
