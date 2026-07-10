"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBLogger = void 0;
const crypto_1 = require("crypto");
const aws_db_client_1 = require("../../../../core/database/aws-db-client");
class DBLogger {
    constructor(options) {
        this.options = {
            enabled: Boolean(options.enabled),
            tableName: options.tableName || 'facebook_operation_logs',
        };
        this.client = this.options.enabled ? (0, aws_db_client_1.getDbClient)() : null;
    }
    async log(entry) {
        if (!this.client || !this.options.enabled)
            return;
        const payload = {
            id: (0, crypto_1.randomUUID)(),
            created_at: new Date().toISOString(),
            ...entry,
        };
        try {
            await this.client.from(this.options.tableName).insert(payload);
        }
        catch (error) {
            // Never break node execution on logging failure.
            console.warn('[Facebook][DBLogger] Failed to write operation log:', error);
        }
    }
}
exports.DBLogger = DBLogger;
