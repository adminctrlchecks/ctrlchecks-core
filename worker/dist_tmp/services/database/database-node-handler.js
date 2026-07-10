"use strict";
/**
 * Database Node Handler
 *
 * Central handler for all database node executions.
 * This is called from execute-workflow.ts to execute database nodes.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeDatabaseNode = executeDatabaseNode;
/**
 * Execute a database node by type
 */
async function executeDatabaseNode(nodeType, context) {
    switch (nodeType) {
        case 'sql_server':
        case 'mssql': {
            const { runSQLServerNode } = await Promise.resolve().then(() => __importStar(require('./sqlServerNode')));
            return await runSQLServerNode(context);
        }
        case 'mongodb': {
            const { runMongoDBNode } = await Promise.resolve().then(() => __importStar(require('./mongoDBNode')));
            return await runMongoDBNode(context);
        }
        case 'mysql': {
            const { runMySQLNode } = await Promise.resolve().then(() => __importStar(require('./mysqlNode')));
            return await runMySQLNode(context);
        }
        case 'postgres':
        case 'postgresql': {
            const { runPostgresNode } = await Promise.resolve().then(() => __importStar(require('./postgresNode')));
            return await runPostgresNode(context);
        }
        case 'redis': {
            const { runRedisNode } = await Promise.resolve().then(() => __importStar(require('./redisNode')));
            return await runRedisNode(context);
        }
        case 'snowflake': {
            const { runSnowflakeNode } = await Promise.resolve().then(() => __importStar(require('./snowflakeNode')));
            return await runSnowflakeNode(context);
        }
        case 'sqlite': {
            const { runSQLiteNode } = await Promise.resolve().then(() => __importStar(require('./sqliteNode')));
            return await runSQLiteNode(context);
        }
        case 'db': {
            const { runSupabaseNode } = await Promise.resolve().then(() => __importStar(require('./supabaseNode')));
            return await runSupabaseNode(context);
        }
        case 'timescaledb':
        case 'timescale': {
            const { runTimescaleDBNode } = await Promise.resolve().then(() => __importStar(require('./timescaleDBNode')));
            return await runTimescaleDBNode(context);
        }
        case 'intuit_smes':
        case 'intuit': {
            const { runIntuitSmesNode } = await Promise.resolve().then(() => __importStar(require('./intuitSmesNode')));
            return await runIntuitSmesNode(context);
        }
        case 'odoo': {
            const { runOdooNode } = await Promise.resolve().then(() => __importStar(require('./odooNode')));
            return await runOdooNode(context);
        }
        case 'firebase': {
            const { runFirebaseNode } = await Promise.resolve().then(() => __importStar(require('./firebaseNode')));
            return await runFirebaseNode(context);
        }
        case 'google_cloud_storage': {
            const { runGCSNode } = await Promise.resolve().then(() => __importStar(require('./gcsNode')));
            return await runGCSNode(context);
        }
        default:
            return {
                success: false,
                error: `Unknown database node type: ${nodeType}`,
            };
    }
}
