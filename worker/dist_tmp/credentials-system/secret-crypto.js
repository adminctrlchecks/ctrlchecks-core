"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptJson = encryptJson;
exports.decryptJson = decryptJson;
exports.maskSecrets = maskSecrets;
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
function encryptionKey() {
    const raw = process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
    if (!raw && process.env.NODE_ENV === 'production') {
        throw new Error('CREDENTIAL_ENCRYPTION_KEY or ENCRYPTION_KEY is required in production');
    }
    const material = raw || 'ctrlchecks-local-development-credential-key';
    if (/^[a-f0-9]{64}$/i.test(material)) {
        return Buffer.from(material, 'hex');
    }
    return crypto_1.default.createHash('sha256').update(material).digest().subarray(0, KEY_LENGTH);
}
function encryptJson(value) {
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, encryptionKey(), iv, { authTagLength: TAG_LENGTH });
    const plaintext = JSON.stringify(value);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}
function decryptJson(encryptedValue) {
    const [version, iv, tag, ciphertext] = encryptedValue.split(':');
    if (version !== 'v1' || !iv || !tag || !ciphertext) {
        throw new Error('Invalid encrypted credential payload');
    }
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(iv, 'base64url'), { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'base64url')),
        decipher.final(),
    ]);
    return JSON.parse(decrypted.toString('utf8'));
}
function maskSecrets(value) {
    if (Array.isArray(value))
        return value.map(maskSecrets);
    if (!value || typeof value !== 'object')
        return value;
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [
        key,
        /token|secret|password|key|authorization|credential/i.test(key) ? '[REDACTED]' : maskSecrets(val),
    ]));
}
