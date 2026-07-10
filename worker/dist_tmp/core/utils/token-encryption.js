"use strict";
/**
 * Token Encryption Utilities
 *
 * Production-ready encryption for OAuth tokens before database storage.
 * Uses AES-256-GCM encryption with a key derived from environment variable.
 *
 * SECURITY NOTES:
 * - Tokens are NEVER stored in plaintext
 * - Encryption key must be set via ENCRYPTION_KEY environment variable
 * - Uses authenticated encryption (GCM) to prevent tampering
 * - IV (initialization vector) is randomly generated for each encryption
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptToken = encryptToken;
exports.decryptToken = decryptToken;
exports.isEncrypted = isEncrypted;
exports.encryptTokens = encryptTokens;
exports.decryptTokens = decryptTokens;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config");
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits
const TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const ITERATIONS = 100000; // PBKDF2 iterations
/**
 * Get encryption key from environment variable
 * Falls back to a default key in development (NOT SECURE FOR PRODUCTION)
 */
function getEncryptionKey() {
    const encryptionKey = process.env.ENCRYPTION_KEY || config_1.config.encryptionKey;
    if (!encryptionKey) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('ENCRYPTION_KEY environment variable is required in production. ' +
                'Generate a secure key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
        }
        // Development fallback (NOT SECURE - only for local development)
        console.warn('⚠️  WARNING: Using default encryption key. Set ENCRYPTION_KEY in production!');
        return crypto_1.default.pbkdf2Sync('default-dev-key-change-in-production', 'salt', ITERATIONS, KEY_LENGTH, 'sha256');
    }
    // Derive key from environment variable using PBKDF2
    // This allows using a passphrase instead of raw key
    return crypto_1.default.pbkdf2Sync(encryptionKey, 'ctrlchecks-token-encryption-salt', ITERATIONS, KEY_LENGTH, 'sha256');
}
/**
 * Encrypt a token before storing in database
 *
 * @param plaintext - The token to encrypt
 * @returns Encrypted token with IV and auth tag (format: iv:tag:encrypted)
 */
function encryptToken(plaintext) {
    if (!plaintext || typeof plaintext !== 'string') {
        throw new Error('Token encryption: plaintext must be a non-empty string');
    }
    try {
        const key = getEncryptionKey();
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        // Return format: iv:authTag:encrypted
        // This allows us to decrypt later
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }
    catch (error) {
        console.error('[Token Encryption] Failed to encrypt token:', error);
        throw new Error(`Token encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Decrypt a token retrieved from database
 *
 * @param encrypted - The encrypted token (format: iv:tag:encrypted)
 * @returns Decrypted token
 */
function decryptToken(encrypted) {
    if (!encrypted || typeof encrypted !== 'string') {
        throw new Error('Token decryption: encrypted token must be a non-empty string');
    }
    try {
        // Parse format: iv:authTag:encrypted
        const parts = encrypted.split(':');
        if (parts.length !== 3) {
            // Older local/dev rows were written before token encryption was enforced.
            // Treat non-encrypted values as plaintext so existing connections keep working.
            console.warn('[Token Decryption] Token is not encrypted; using plaintext compatibility path.');
            return encrypted;
        }
        const [ivHex, authTagHex, encryptedHex] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const key = getEncryptionKey();
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        console.error('[Token Decryption] Failed to decrypt token:', error);
        // If decryption fails, it might be an old unencrypted token
        // Try to return as-is (for migration purposes)
        console.warn('[Token Decryption] Decryption failed - token may be unencrypted. Attempting to use as-is.');
        return encrypted;
    }
}
/**
 * Check if a string is encrypted (has the expected format)
 */
function isEncrypted(token) {
    if (!token || typeof token !== 'string') {
        return false;
    }
    const parts = token.split(':');
    return parts.length === 3 && parts.every(part => /^[0-9a-f]+$/i.test(part));
}
/**
 * Encrypt multiple tokens at once
 */
function encryptTokens(tokens) {
    return {
        access_token: encryptToken(tokens.access_token),
        refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
    };
}
/**
 * Decrypt multiple tokens at once
 */
function decryptTokens(tokens) {
    return {
        access_token: decryptToken(tokens.access_token),
        refresh_token: tokens.refresh_token ? decryptToken(tokens.refresh_token) : null,
    };
}
