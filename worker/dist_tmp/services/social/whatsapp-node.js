"use strict";
/**
 * WhatsApp Node Executor
 *
 * Implements all WhatsApp Cloud API operations via the Meta Graph API v18.0.
 * Routing is driven by params.resource / params.operation — no hardcoded node.type checks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppNode = void 0;
const acknowledged_response_1 = require("../../core/http/acknowledged-response");
// ─── WhatsAppNode class ───────────────────────────────────────────────────────
class WhatsAppNode {
    constructor(accessToken, db) {
        this.accessToken = accessToken;
        this.db = db;
        this.apiCallCount = 0;
        this.baseUrl = 'https://graph.facebook.com/v18.0';
    }
    // ── Public entry point ────────────────────────────────────────────────────
    async execute(params) {
        const startedAt = Date.now();
        this.apiCallCount = 0;
        try {
            const data = await this.dispatch(params);
            const executionTimeMs = Date.now() - startedAt;
            console.log(`[WhatsAppNode] ${params.resource}.${params.operation} completed in ${executionTimeMs}ms, apiCalls=${this.apiCallCount}`);
            return {
                success: true,
                resource: params.resource,
                operation: params.operation,
                data,
                error: null,
                meta: { executionTimeMs, apiCallCount: this.apiCallCount },
            };
        }
        catch (error) {
            const executionTimeMs = Date.now() - startedAt;
            const metaError = this.parseMetaError(error);
            console.log(`[WhatsAppNode] ${params.resource}.${params.operation} failed in ${executionTimeMs}ms, apiCalls=${this.apiCallCount}`);
            return {
                success: false,
                resource: params.resource,
                operation: params.operation,
                data: {},
                error: metaError,
                meta: { executionTimeMs, apiCallCount: this.apiCallCount },
            };
        }
    }
    // ── Private dispatcher ────────────────────────────────────────────────────
    async dispatch(params) {
        switch (params.resource) {
            case 'message':
                return this.handleMessage(params);
            case 'contact':
                return this.handleContact(params);
            case 'conversation':
                return this.handleConversation(params);
            case 'template':
                return this.handleTemplate(params);
            case 'campaign':
                return this.handleCampaign(params);
            case 'aiAgent':
                return this.handleAiAgent(params);
            default:
                throw new Error(`Unknown resource: ${params.resource}`);
        }
    }
    // ── message resource ──────────────────────────────────────────────────────
    async handleMessage(params) {
        const phoneNumberId = await this.resolvePhoneNumberId(params);
        switch (params.operation) {
            case 'sendText': {
                return this.callMetaApi(`/${phoneNumberId}/messages`, 'POST', {
                    messaging_product: 'whatsapp',
                    to: params.to,
                    type: 'text',
                    text: { body: params.text, preview_url: params.previewUrl },
                });
            }
            case 'sendMedia': {
                const mediaType = params.mediaType ?? 'image';
                const mediaPayload = params.mediaId
                    ? { id: params.mediaId, caption: params.caption }
                    : { link: params.mediaUrl, caption: params.caption };
                return this.callMetaApi(`/${phoneNumberId}/messages`, 'POST', {
                    messaging_product: 'whatsapp',
                    to: params.to,
                    type: mediaType,
                    [mediaType]: mediaPayload,
                });
            }
            case 'sendLocation': {
                return this.callMetaApi(`/${phoneNumberId}/messages`, 'POST', {
                    messaging_product: 'whatsapp',
                    to: params.to,
                    type: 'location',
                    location: {
                        latitude: params.latitude,
                        longitude: params.longitude,
                        name: params.locationName,
                        address: params.address,
                    },
                });
            }
            case 'sendContact': {
                return this.callMetaApi(`/${phoneNumberId}/messages`, 'POST', {
                    messaging_product: 'whatsapp',
                    to: params.to,
                    type: 'contacts',
                    contacts: params.contacts,
                });
            }
            case 'sendTemplate': {
                this.assertTemplateApproved(params);
                return this.callMetaApi(`/${phoneNumberId}/messages`, 'POST', {
                    messaging_product: 'whatsapp',
                    to: params.to,
                    type: 'template',
                    template: {
                        name: params.templateName,
                        language: { code: params.language },
                        components: params.templateComponents ?? [],
                    },
                });
            }
            case 'sendInteractiveButtons': {
                const interactive = {
                    type: 'button',
                    body: { text: params.bodyText },
                    action: { buttons: params.buttons },
                };
                if (params.headerText) {
                    interactive.header = { type: 'text', text: params.headerText };
                }
                if (params.footerText) {
                    interactive.footer = { text: params.footerText };
                }
                return this.callMetaApi(`/${phoneNumberId}/messages`, 'POST', {
                    messaging_product: 'whatsapp',
                    to: params.to,
                    type: 'interactive',
                    interactive,
                });
            }
            case 'sendInteractiveList': {
                return this.callMetaApi(`/${phoneNumberId}/messages`, 'POST', {
                    messaging_product: 'whatsapp',
                    to: params.to,
                    type: 'interactive',
                    interactive: {
                        type: 'list',
                        body: { text: params.bodyText },
                        action: { button: params.buttonText, sections: params.sections },
                    },
                });
            }
            case 'sendInteractiveCTA': {
                return this.callMetaApi(`/${phoneNumberId}/messages`, 'POST', {
                    messaging_product: 'whatsapp',
                    to: params.to,
                    type: 'interactive',
                    interactive: {
                        type: 'cta_url',
                        body: { text: params.bodyText },
                        action: { name: 'cta_url', parameters: params.ctaUrl },
                    },
                });
            }
            case 'markAsRead': {
                return this.callMetaApi(`/${phoneNumberId}/messages`, 'POST', {
                    messaging_product: 'whatsapp',
                    status: 'read',
                    message_id: params.messageId,
                });
            }
            default:
                throw new Error(`Unknown message operation: ${params.operation}`);
        }
    }
    // ── contact resource ──────────────────────────────────────────────────────
    async handleContact(params) {
        const businessAccountId = await this.resolveBusinessAccountId(params);
        switch (params.operation) {
            case 'create': {
                return this.callMetaApi(`/${businessAccountId}/contacts`, 'POST', {
                    name: params.contactName,
                    phone: params.contactPhone,
                    email: params.contactEmail,
                });
            }
            case 'update': {
                const body = {};
                if (params.contactName !== undefined)
                    body.name = params.contactName;
                if (params.contactPhone !== undefined)
                    body.phone = params.contactPhone;
                if (params.contactEmail !== undefined)
                    body.email = params.contactEmail;
                return this.callMetaApi(`/${params.contactId}`, 'POST', body);
            }
            case 'delete': {
                return this.callMetaApi(`/${params.contactId}`, 'DELETE');
            }
            case 'search': {
                const search = params.contactPhone ?? params.contactName ?? '';
                return this.callMetaApi(`/${businessAccountId}/contacts?search=${encodeURIComponent(search)}&limit=${params.limit ?? 20}`, 'GET');
            }
            case 'addLabel': {
                return this.callMetaApi(`/${params.contactId}/labels`, 'POST', {
                    labels: params.labels,
                });
            }
            case 'removeLabel': {
                return this.callMetaApi(`/${params.contactId}/labels`, 'DELETE', {
                    labels: params.labels,
                });
            }
            default:
                throw new Error(`Unknown contact operation: ${params.operation}`);
        }
    }
    // ── conversation resource ─────────────────────────────────────────────────
    async handleConversation(params) {
        const phoneNumberId = await this.resolvePhoneNumberId(params);
        switch (params.operation) {
            case 'list': {
                const qs = new URLSearchParams();
                if (params.limit)
                    qs.set('limit', String(params.limit));
                if (params.after)
                    qs.set('after', params.after);
                return this.callMetaApi(`/${phoneNumberId}/conversations?${qs.toString()}`, 'GET');
            }
            case 'get': {
                return this.callMetaApi(`/${params.conversationId}?fields=id,status,messages,participants`, 'GET');
            }
            case 'close': {
                return this.callMetaApi(`/${params.conversationId}`, 'POST', { status: 'resolved' });
            }
            case 'archive': {
                return this.callMetaApi(`/${params.conversationId}`, 'POST', { status: 'archived' });
            }
            case 'markAsRead': {
                return this.callMetaApi(`/${params.conversationId}/mark_as_read`, 'POST');
            }
            default:
                throw new Error(`Unknown conversation operation: ${params.operation}`);
        }
    }
    // ── template resource ─────────────────────────────────────────────────────
    async handleTemplate(params) {
        const businessAccountId = await this.resolveBusinessAccountId(params);
        switch (params.operation) {
            case 'list': {
                return this.callMetaApi(`/${businessAccountId}/message_templates?limit=${params.limit ?? 20}`, 'GET');
            }
            case 'get': {
                return this.callMetaApi(`/${businessAccountId}/message_templates?name=${encodeURIComponent(params.templateName ?? '')}`, 'GET');
            }
            case 'create': {
                return this.callMetaApi(`/${businessAccountId}/message_templates`, 'POST', {
                    name: params.templateName,
                    language: params.language,
                    category: params.templateCategory,
                    components: params.templateComponents,
                });
            }
            case 'delete': {
                return this.callMetaApi(`/${businessAccountId}/message_templates?name=${encodeURIComponent(params.templateName ?? '')}`, 'DELETE');
            }
            default:
                throw new Error(`Unknown template operation: ${params.operation}`);
        }
    }
    // ── campaign resource ─────────────────────────────────────────────────────
    async handleCampaign(params) {
        switch (params.operation) {
            case 'create': {
                this.assertTemplateApproved(params);
                const recipients = params.recipients ?? [];
                const phoneNumberId = await this.resolvePhoneNumberId(params);
                let sent = 0;
                let failed = 0;
                for (const recipient of recipients) {
                    try {
                        await this.callMetaApi(`/${phoneNumberId}/messages`, 'POST', {
                            messaging_product: 'whatsapp',
                            to: recipient,
                            type: 'template',
                            template: {
                                name: params.templateName,
                                language: { code: params.language },
                                components: params.templateComponents ?? [],
                            },
                        });
                        sent++;
                    }
                    catch {
                        failed++;
                    }
                }
                return { sent, failed, total: recipients.length };
            }
            case 'list': {
                const businessAccountId = await this.resolveBusinessAccountId(params);
                return this.callMetaApi(`/${businessAccountId}/campaigns?limit=${params.limit ?? 20}`, 'GET');
            }
            default:
                throw new Error(`Unknown campaign operation: ${params.operation}`);
        }
    }
    // ── aiAgent resource ──────────────────────────────────────────────────────
    async handleAiAgent(params) {
        switch (params.operation) {
            case 'enable': {
                return this.callMetaApi(`/${params.conversationId}/ai_agent`, 'POST', { enabled: true });
            }
            case 'disable': {
                return this.callMetaApi(`/${params.conversationId}/ai_agent`, 'POST', { enabled: false });
            }
            case 'getSuggestions': {
                return this.callMetaApi(`/${params.conversationId}/ai_suggestions`, 'GET');
            }
            default:
                throw new Error(`Unknown aiAgent operation: ${params.operation}`);
        }
    }
    // ── Private helpers ───────────────────────────────────────────────────────
    async callMetaApi(path, method, body) {
        this.apiCallCount++;
        const url = `${this.baseUrl}${path}`;
        const headers = {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
        };
        const response = await fetch(url, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const parsed = await (0, acknowledged_response_1.readAcknowledgedHttpResponse)(response);
        const json = parsed.data;
        if (!response.ok) {
            const err = json?.error ?? {};
            const error = new Error(err.message ?? parsed.rawText ?? `HTTP ${response.status}`);
            error.code = err.code;
            error.fbtrace_id = err.fbtrace_id;
            error.errorSubcode = err.error_subcode;
            error.errorData = err.error_data;
            throw error;
        }
        return json;
    }
    parseMetaError(error) {
        const code = error?.code ?? 0;
        const message = error?.message ?? String(error);
        const fbtrace_id = error?.fbtrace_id;
        let userMessage;
        if (code === 190) {
            userMessage = 'Your Facebook/Meta access token has expired. Please reconnect your account.';
        }
        else if (code === 10 || (code >= 200 && code <= 299)) {
            const scope = error?.errorData?.required_permission ?? 'required permission';
            userMessage = `Missing permission: ${scope}. Please reconnect your account and grant the required permissions.`;
        }
        else if (code === 131030) {
            const name = error?.errorData?.template_name ?? 'unknown';
            userMessage = `Template '${name}' is not approved for sending.`;
        }
        else if (code === 368) {
            userMessage = 'Your WhatsApp account has been temporarily blocked. Please try again later.';
        }
        else {
            userMessage = `Meta API error ${code}: ${message}`;
        }
        return { code, message, fbtrace_id, userMessage };
    }
    async resolvePhoneNumberId(params) {
        if (params.phoneNumberId) {
            return params.phoneNumberId;
        }
        const result = await this.callMetaApi('/me/phone_numbers', 'GET');
        const first = result?.data?.[0];
        if (!first?.id) {
            throw new Error('Could not resolve phoneNumberId: no phone numbers found on this account.');
        }
        return first.id;
    }
    async resolveBusinessAccountId(params) {
        if (params.businessAccountId) {
            return params.businessAccountId;
        }
        const phoneNumberId = await this.resolvePhoneNumberId(params);
        const result = await this.callMetaApi(`/${phoneNumberId}?fields=whatsapp_business_account`, 'GET');
        const wabaId = result?.whatsapp_business_account?.id;
        if (!wabaId) {
            throw new Error('Could not resolve businessAccountId: WABA not found for this phone number.');
        }
        return wabaId;
    }
    assertTemplateApproved(params) {
        if (params.templateStatus !== undefined && params.templateStatus !== 'APPROVED') {
            const err = new Error(`Template '${params.templateName ?? 'unknown'}' is not approved for sending. Current status: ${params.templateStatus}.`);
            err.code = 131030;
            err.errorData = { template_name: params.templateName ?? 'unknown' };
            throw err;
        }
    }
}
exports.WhatsAppNode = WhatsAppNode;
