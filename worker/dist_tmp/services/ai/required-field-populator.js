"use strict";
/**
 * ✅ REQUIRED FIELD POPULATOR - Production-Grade Required Field Auto-Population
 *
 * This service intelligently populates required fields that are missing,
 * preventing "Required field 'X' is missing or empty" errors.
 *
 * Architecture:
 * - Analyzes node schema to find required fields
 * - Uses upstream node outputs to infer values
 * - Applies intelligent defaults based on field type and name
 * - Uses LLM for semantic inference when needed
 * - Guarantees all required fields are populated
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.populateRequiredFields = populateRequiredFields;
const input_field_mapper_1 = require("./input-field-mapper");
const node_library_1 = require("../nodes/node-library");
const unified_node_registry_1 = require("../../core/registry/unified-node-registry");
const unified_node_type_normalizer_1 = require("../../core/utils/unified-node-type-normalizer");
const type_converter_1 = require("../../core/utils/type-converter");
/**
 * ✅ Populate all required fields for a node
 */
async function populateRequiredFields(node, previousNode, allNodes, nodeIndex, llmAdapter) {
    const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
    const schema = node_library_1.nodeLibrary.getSchema(nodeType);
    if (!schema?.configSchema) {
        return {
            populated: {},
            source: 'default',
            confidence: 0,
            notes: [`No schema found for node type: ${nodeType}`],
        };
    }
    const config = node.data?.config || {};
    const requiredFields = schema.configSchema.required || [];
    const optionalFields = schema.configSchema.optional || {};
    const allFields = { ...optionalFields };
    // Add required fields to allFields
    requiredFields.forEach(fieldName => {
        if (!allFields[fieldName]) {
            allFields[fieldName] = { type: 'string', description: '', requiredIf: undefined };
        }
    });
    const populated = {};
    const notes = [];
    let confidence = 1.0;
    let source = 'default';
    // UNIVERSAL INVARIANT:
    // Any field that exists in the unified node INPUT schema must remain empty at build time.
    // Runtime (dynamic-node-executor) will populate it after previous node execution using
    // AI Input Resolver + guarantee layer.
    const unifiedDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    const runtimeInputKeys = new Set(Object.keys(unifiedDef?.inputSchema || {}));
    // Step 1: Check existing config for required fields
    for (const fieldName of requiredFields) {
        const existingValue = config[fieldName];
        // If field exists and is not empty, keep it
        if (existingValue !== undefined && existingValue !== null && existingValue !== '') {
            populated[fieldName] = existingValue;
            continue;
        }
        // If this is a runtime-resolved input field, leave it empty (no upstream/default/LLM inference).
        if (runtimeInputKeys.has(fieldName)) {
            populated[fieldName] = '';
            notes.push(`Left '${fieldName}' empty for runtime input resolution (unified inputSchema field)`);
            source = 'inferred';
            confidence = Math.min(confidence, 0.0);
            continue;
        }
        // Field is missing - need to populate
        const fieldDef = allFields[fieldName];
        const fieldType = (fieldDef?.type || 'string');
        // Step 2: Try to infer from upstream node
        if (previousNode) {
            const upstreamOutput = input_field_mapper_1.inputFieldMapper.getNodeOutputFields(previousNode);
            const inferred = inferFieldFromUpstream(fieldName, fieldType, upstreamOutput);
            if (inferred.success) {
                populated[fieldName] = inferred.value;
                source = 'upstream';
                confidence = Math.min(confidence, inferred.confidence);
                notes.push(`Inferred "${fieldName}" from upstream node: ${inferred.reason}`);
                continue;
            }
        }
        // Step 3: Try semantic matching across all upstream nodes
        const upstreamNodes = allNodes.slice(0, nodeIndex);
        for (let i = upstreamNodes.length - 1; i >= 0; i--) {
            const upstreamNode = upstreamNodes[i];
            const upstreamOutput = input_field_mapper_1.inputFieldMapper.getNodeOutputFields(upstreamNode);
            const inferred = inferFieldFromUpstream(fieldName, fieldType, upstreamOutput);
            if (inferred.success) {
                populated[fieldName] = inferred.value;
                source = 'upstream';
                confidence = Math.min(confidence, inferred.confidence);
                notes.push(`Inferred "${fieldName}" from upstream node ${i}: ${inferred.reason}`);
                break;
            }
        }
        // Step 4: Use intelligent default based on field name and type
        const defaultValue = getIntelligentDefault(fieldName, fieldType, schema);
        populated[fieldName] = defaultValue.value;
        notes.push(`Using default for "${fieldName}": ${defaultValue.reason}`);
        confidence = Math.min(confidence, defaultValue.confidence);
    }
    // Step 5: If LLM available and confidence is low, try LLM inference
    if (llmAdapter && confidence < 0.7 && previousNode) {
        const runtimeFieldSet = runtimeInputKeys;
        const llmResult = await inferWithLLM(node, previousNode, requiredFields.filter((f) => !runtimeFieldSet.has(f) && (!populated[f] || populated[f] === '')), llmAdapter);
        if (llmResult.success) {
            Object.assign(populated, llmResult.populated);
            source = 'llm';
            confidence = Math.max(confidence, llmResult.confidence);
            notes.push(...llmResult.notes);
        }
    }
    return {
        populated,
        source,
        confidence,
        notes,
    };
}
/**
 * Infer field value from upstream node output
 */
function inferFieldFromUpstream(fieldName, fieldType, upstreamOutput) {
    const fieldNameLower = fieldName.toLowerCase();
    // Exact match
    for (const outputField of upstreamOutput.outputFields) {
        if (outputField.toLowerCase() === fieldNameLower) {
            const value = upstreamOutput.sampleValues?.[outputField];
            if (value !== undefined) {
                const converted = (0, type_converter_1.convertToType)(value, fieldType, fieldName);
                return {
                    success: converted.success,
                    value: converted.value,
                    confidence: 0.9,
                    reason: `Exact match: ${outputField}`,
                };
            }
        }
    }
    // Semantic matching
    const semanticMatches = {
        email: ['email', 'to', 'recipient', 'userEmail', 'contactEmail', 'from'],
        name: ['name', 'firstName', 'firstname', 'fullName', 'username', 'title'],
        message: ['message', 'text', 'content', 'body', 'response_text', 'responseText', 'description'],
        subject: ['subject', 'title', 'heading', 'name'],
        text: ['text', 'message', 'content', 'body', 'response_text'],
        data: ['data', 'output', 'result', 'value', 'response'],
        id: ['id', 'objectId', 'recordId', 'messageId', 'eventId', 'taskId', 'userId'],
        url: ['url', 'link', 'href', 'uri', 'webhook'],
        phone: ['phone', 'phoneNumber', 'mobile', 'telephone'],
        date: ['date', 'timestamp', 'createdAt', 'updatedAt', 'time'],
        owner: ['owner', 'userId', 'user', 'author', 'creator'],
        type: ['type', 'category', 'kind', 'class'],
    };
    for (const [key, synonyms] of Object.entries(semanticMatches)) {
        if (fieldNameLower.includes(key)) {
            for (const synonym of synonyms) {
                const match = upstreamOutput.outputFields.find(f => f.toLowerCase() === synonym.toLowerCase() ||
                    f.toLowerCase().includes(synonym.toLowerCase()));
                if (match) {
                    const value = upstreamOutput.sampleValues?.[match];
                    if (value !== undefined) {
                        const converted = (0, type_converter_1.convertToType)(value, fieldType, fieldName);
                        return {
                            success: converted.success,
                            value: converted.value,
                            confidence: 0.7,
                            reason: `Semantic match: ${match} (${synonym})`,
                        };
                    }
                }
            }
        }
    }
    // Use first available field if type is compatible
    if (upstreamOutput.outputFields.length > 0) {
        const firstField = upstreamOutput.outputFields[0];
        const value = upstreamOutput.sampleValues?.[firstField];
        if (value !== undefined) {
            const converted = (0, type_converter_1.convertToType)(value, fieldType, fieldName);
            if (converted.success) {
                return {
                    success: true,
                    value: converted.value,
                    confidence: 0.5,
                    reason: `Fallback: using first available field ${firstField}`,
                };
            }
        }
    }
    return { success: false, confidence: 0, reason: 'No match found' };
}
/**
 * Get intelligent default based on field name and type
 */
function getIntelligentDefault(fieldName, fieldType, schema) {
    const fieldNameLower = fieldName.toLowerCase();
    // Type-specific defaults
    const typeDefaults = {
        string: '',
        number: 0,
        boolean: false,
        array: [],
        object: {},
        json: {},
        email: '',
        datetime: '',
        expression: '',
    };
    // Field-name-specific defaults
    if (fieldNameLower.includes('email') || fieldNameLower === 'to' || fieldNameLower === 'recipient') {
        return { value: '', confidence: 0.3, reason: 'Email field - requires user input' };
    }
    if (fieldNameLower.includes('subject') || fieldNameLower === 'title') {
        return { value: 'Notification', confidence: 0.4, reason: 'Subject field default' };
    }
    if (fieldNameLower.includes('message') || fieldNameLower === 'body' || fieldNameLower === 'content') {
        return { value: '', confidence: 0.3, reason: 'Message field - requires content' };
    }
    if (fieldNameLower.includes('id')) {
        return { value: '', confidence: 0.2, reason: 'ID field - must come from upstream' };
    }
    if (fieldNameLower.includes('url') || fieldNameLower === 'link') {
        return { value: '', confidence: 0.2, reason: 'URL field - requires valid URL' };
    }
    // Check schema for default value
    const fieldDef = schema.configSchema?.optional?.[fieldName] || schema.configSchema?.required?.find((f) => f === fieldName);
    if (fieldDef?.default !== undefined) {
        return { value: fieldDef.default, confidence: 0.8, reason: 'Schema default value' };
    }
    // Use type default
    return {
        value: typeDefaults[fieldType],
        confidence: 0.5,
        reason: `Type default for ${fieldType}`,
    };
}
/**
 * Use LLM to infer missing required fields
 */
async function inferWithLLM(node, previousNode, missingFields, llmAdapter) {
    if (!previousNode || missingFields.length === 0) {
        return { success: false, populated: {}, confidence: 0, notes: [] };
    }
    try {
        const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
        const previousOutput = input_field_mapper_1.inputFieldMapper.getNodeOutputFields(previousNode);
        const prompt = `You are a workflow field inference assistant.

Node Type: ${nodeType}
Missing Required Fields: ${missingFields.join(', ')}

Previous Node Output:
${JSON.stringify(previousOutput.outputFields, null, 2)}

Sample Values:
${JSON.stringify(previousOutput.sampleValues, null, 2)}

Task: Infer values for missing required fields based on previous node output.

Return JSON:
{
  "fields": {
    "fieldName": "inferred_value",
    ...
  },
  "confidence": 0.0-1.0,
  "reasoning": "explanation"
}`;
        const messages = [
            { role: 'system', content: 'You are a workflow field inference assistant.' },
            { role: 'user', content: prompt }
        ];
        const response = await llmAdapter.chat('ollama', messages, {
            model: 'llama3.2',
            temperature: 0.1,
        });
        const parsed = JSON.parse(response.content);
        const populated = {};
        if (parsed.fields) {
            for (const [fieldName, value] of Object.entries(parsed.fields)) {
                if (missingFields.includes(fieldName)) {
                    populated[fieldName] = value;
                }
            }
        }
        return {
            success: Object.keys(populated).length > 0,
            populated,
            confidence: parsed.confidence || 0.6,
            notes: [parsed.reasoning || 'LLM inference completed'],
        };
    }
    catch (error) {
        return {
            success: false,
            populated: {},
            confidence: 0,
            notes: [`LLM inference failed: ${error.message}`],
        };
    }
}
