"use strict";
/**
 * MongoDB Node Executor
 *
 * Supports operations:
 * - find: Query documents with filter, projection, limit, skip, sort
 * - insertOne: Insert a single document
 * - insertMany: Insert multiple documents
 * - updateOne: Update a single document
 * - updateMany: Update multiple documents
 * - deleteOne: Delete a single document
 * - deleteMany: Delete multiple documents
 * - aggregate: Run aggregation pipeline
 *
 * Uses mongodb driver.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMongoDBNode = runMongoDBNode;
const mongodb_1 = require("mongodb");
/**
 * Validate MongoDB credentials
 */
function validateCredentials(credentials) {
    if (credentials.connectionString) {
        if (typeof credentials.connectionString !== 'string' || credentials.connectionString.trim() === '') {
            return { valid: false, error: 'connectionString must be a non-empty string' };
        }
    }
    else {
        if (!credentials.host || typeof credentials.host !== 'string' || credentials.host.trim() === '') {
            return { valid: false, error: 'host is required when connectionString is not provided' };
        }
        if (!credentials.database || typeof credentials.database !== 'string' || credentials.database.trim() === '') {
            return { valid: false, error: 'database is required' };
        }
    }
    return { valid: true };
}
/**
 * Build MongoDB connection string
 */
function buildConnectionString(credentials) {
    if (credentials.connectionString) {
        return credentials.connectionString;
    }
    const host = credentials.host || 'localhost';
    const port = credentials.port || 27017;
    const authSource = credentials.authSource || 'admin';
    let connectionString = 'mongodb://';
    if (credentials.username && credentials.password) {
        connectionString += `${encodeURIComponent(credentials.username)}:${encodeURIComponent(credentials.password)}@`;
    }
    connectionString += `${host}:${port}`;
    if (credentials.database) {
        connectionString += `/${credentials.database}`;
    }
    connectionString += `?authSource=${authSource}`;
    if (credentials.ssl) {
        connectionString += '&ssl=true';
    }
    return connectionString;
}
/**
 * Parse JSON safely
 */
function parseJSON(value) {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        }
        catch {
            return value;
        }
    }
    return value;
}
/**
 * Execute MongoDB operation
 */
async function executeOperation(db, operation) {
    const collection = db.collection(operation.collection);
    switch (operation.name) {
        case 'find': {
            let query = collection.find(operation.filter || {});
            if (operation.projection) {
                query = query.project(parseJSON(operation.projection));
            }
            if (operation.sort) {
                query = query.sort(parseJSON(operation.sort));
            }
            if (operation.skip) {
                query = query.skip(operation.skip);
            }
            if (operation.limit) {
                query = query.limit(operation.limit);
            }
            const documents = await query.toArray();
            return {
                documents,
                count: documents.length,
            };
        }
        case 'insertOne': {
            if (!operation.document) {
                throw new Error('document is required for insertOne operation');
            }
            const result = await collection.insertOne(parseJSON(operation.document));
            return {
                insertedId: result.insertedId,
                acknowledged: result.acknowledged,
            };
        }
        case 'insertMany': {
            if (!operation.documents || !Array.isArray(operation.documents)) {
                throw new Error('documents array is required for insertMany operation');
            }
            const documents = operation.documents.map(doc => parseJSON(doc));
            const result = await collection.insertMany(documents);
            return {
                insertedIds: result.insertedIds,
                insertedCount: result.insertedCount,
                acknowledged: result.acknowledged,
            };
        }
        case 'updateOne': {
            if (!operation.filter) {
                throw new Error('filter is required for updateOne operation');
            }
            if (!operation.update) {
                throw new Error('update is required for updateOne operation');
            }
            const result = await collection.updateOne(parseJSON(operation.filter), parseJSON(operation.update), operation.options || {});
            return {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
                upsertedCount: result.upsertedCount,
                upsertedId: result.upsertedId,
                acknowledged: result.acknowledged,
            };
        }
        case 'updateMany': {
            if (!operation.filter) {
                throw new Error('filter is required for updateMany operation');
            }
            if (!operation.update) {
                throw new Error('update is required for updateMany operation');
            }
            const result = await collection.updateMany(parseJSON(operation.filter), parseJSON(operation.update), operation.options || {});
            return {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
                upsertedCount: result.upsertedCount,
                upsertedId: result.upsertedId,
                acknowledged: result.acknowledged,
            };
        }
        case 'deleteOne': {
            if (!operation.filter) {
                throw new Error('filter is required for deleteOne operation');
            }
            const result = await collection.deleteOne(parseJSON(operation.filter));
            return {
                deletedCount: result.deletedCount,
                acknowledged: result.acknowledged,
            };
        }
        case 'deleteMany': {
            if (!operation.filter) {
                throw new Error('filter is required for deleteMany operation');
            }
            const result = await collection.deleteMany(parseJSON(operation.filter));
            return {
                deletedCount: result.deletedCount,
                acknowledged: result.acknowledged,
            };
        }
        case 'aggregate': {
            if (!operation.pipeline || !Array.isArray(operation.pipeline)) {
                throw new Error('pipeline array is required for aggregate operation');
            }
            const pipeline = operation.pipeline.map(stage => parseJSON(stage));
            const documents = await collection.aggregate(pipeline, operation.options || {}).toArray();
            return {
                documents,
                count: documents.length,
            };
        }
        default:
            throw new Error(`Unsupported operation: ${operation.name}`);
    }
}
/**
 * Run MongoDB node
 */
async function runMongoDBNode(context) {
    const { inputs } = context;
    // Extract credentials
    const credentials = {
        connectionString: inputs.connectionString,
        host: inputs.host,
        port: inputs.port || 27017,
        username: inputs.username,
        password: inputs.password,
        database: inputs.database,
        authSource: inputs.authSource || 'admin',
        ssl: inputs.ssl === true,
    };
    // Extract operation
    const operation = {
        name: inputs.operation,
        collection: inputs.collection,
        filter: inputs.filter,
        projection: inputs.projection,
        limit: inputs.limit,
        skip: inputs.skip,
        sort: inputs.sort,
        document: inputs.document,
        documents: inputs.documents,
        update: inputs.update,
        pipeline: inputs.pipeline,
        options: inputs.options,
    };
    // Validate credentials
    const validation = validateCredentials(credentials);
    if (!validation.valid) {
        return {
            success: false,
            error: validation.error,
        };
    }
    // Validate operation
    if (!operation.name) {
        return {
            success: false,
            error: 'operation is required',
        };
    }
    if (!operation.collection || typeof operation.collection !== 'string' || operation.collection.trim() === '') {
        return {
            success: false,
            error: 'collection is required',
        };
    }
    const validOperations = ['find', 'insertOne', 'insertMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'aggregate'];
    if (!validOperations.includes(operation.name)) {
        return {
            success: false,
            error: `operation must be one of: ${validOperations.join(', ')}`,
        };
    }
    // Build connection string
    const connectionString = buildConnectionString(credentials);
    const databaseName = credentials.database || (credentials.connectionString ? connectionString.split('/').pop()?.split('?')[0] : 'test');
    let client = null;
    try {
        client = new mongodb_1.MongoClient(connectionString);
        await client.connect();
        const db = client.db(databaseName);
        // Execute operation
        const result = await executeOperation(db, operation);
        return {
            success: true,
            data: result,
        };
    }
    catch (error) {
        return {
            success: false,
            error: error.message || 'MongoDB operation failed',
        };
    }
    finally {
        if (client) {
            try {
                await client.close();
            }
            catch (closeError) {
                console.error('[MongoDB] Error closing client:', closeError);
            }
        }
    }
}
