"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.integrationJsonRequest = integrationJsonRequest;
exports.authHeaderFromToken = authHeaderFromToken;
exports.basicAuthHeader = basicAuthHeader;
exports.stripTrailingSlash = stripTrailingSlash;
exports.mergeContextInputs = mergeContextInputs;
const acknowledged_response_1 = require("../../http/acknowledged-response");
const runtime_input_handoff_1 = require("../../execution/runtime-input-handoff");
async function integrationJsonRequest(url, init = {}) {
    const response = await fetch(url, init);
    const parsed = await (0, acknowledged_response_1.readAcknowledgedHttpResponse)(response);
    if (!response.ok) {
        throw new Error((0, acknowledged_response_1.extractProviderErrorMessage)(parsed));
    }
    return parsed.data;
}
function authHeaderFromToken(token) {
    return token ? { Authorization: `Bearer ${token}` } : {};
}
function basicAuthHeader(username, password) {
    return {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    };
}
function stripTrailingSlash(value) {
    return value.replace(/\/+$/, '');
}
function mergeContextInputs(context) {
    return (0, runtime_input_handoff_1.mergeAuthoritativeInputs)(context);
}
