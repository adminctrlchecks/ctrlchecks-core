"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideDatabaseRead = overrideDatabaseRead;
/**
 * Framework-level deprecation mapping.
 * Avoid workflow-builder hacks like "if (type === database_read) replace with google_sheets".
 * Instead, declare replacement in the node contract so ALL workflows normalize consistently.
 */
function overrideDatabaseRead(def, _schema) {
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
