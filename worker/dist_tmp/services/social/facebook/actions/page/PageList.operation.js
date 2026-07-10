"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executePageListOperation = executePageListOperation;
const Pagination_helper_1 = require("../../shared/Pagination.helper");
async function executePageListOperation(client, params) {
    const limit = Math.min(Math.max(Number(params.limit || 25), 1), 500);
    const fields = typeof params.fields === 'string' && params.fields.trim().length > 0
        ? params.fields
        : 'id,name,category,fan_count,verification_status,access_token,perms';
    const result = await (0, Pagination_helper_1.collectCursorPages)(async (after) => client.get('/me/accounts', {
        fields,
        limit,
        after: after || params.after,
    }), Boolean(params.returnAll));
    return {
        data: {
            pages: result.items,
            count: result.items.length,
            summary: {
                managedPages: result.items.length,
            },
        },
        pagination: result.paging,
    };
}
