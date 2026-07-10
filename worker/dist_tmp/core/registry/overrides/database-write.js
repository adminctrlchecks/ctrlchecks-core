"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideDatabaseWrite = overrideDatabaseWrite;
function overrideDatabaseWrite(def, _schema) {
    return {
        ...def,
        credentialSchema: {
            requirements: [
                {
                    provider: 'postgresql',
                    category: 'connection_string',
                    required: false,
                    description: 'PostgreSQL connection string. Falls back to DATABASE_URL when omitted.',
                },
            ],
            credentialFields: ['connectionString'],
        },
        deprecated: true,
        replacement: 'google_sheets',
        tags: Array.from(new Set([...(def.tags || []), 'deprecated'])),
    };
}
