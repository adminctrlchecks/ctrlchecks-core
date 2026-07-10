"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialUserIdError = exports.CredentialStorageError = exports.CredentialRefreshError = exports.CredentialExpiredError = exports.CredentialMissingScopeError = exports.CredentialNotFoundError = exports.CredentialError = void 0;
exports.credentialFixMessage = credentialFixMessage;
class CredentialError extends Error {
    constructor(code, message, context) {
        super(message);
        this.name = code;
        this.code = code;
        this.context = context;
    }
    toJSON() {
        return {
            error: this.code,
            provider: this.context.provider,
            requiredScopes: this.context.requiredScopes,
            userId: this.context.userId,
            action: this.context.action,
            resolverStep: this.context.resolverStep,
            fix: credentialFixMessage(this.context.provider, this.context.requiredScopes),
        };
    }
}
exports.CredentialError = CredentialError;
class CredentialNotFoundError extends CredentialError {
    constructor(context) {
        super('CredentialNotFound', `${context.provider} credential not found for required scopes: ${context.requiredScopes.join(', ') || 'default'}`, context);
    }
}
exports.CredentialNotFoundError = CredentialNotFoundError;
class CredentialMissingScopeError extends CredentialError {
    constructor(context, availableScopes) {
        super('CredentialMissingScope', `${context.provider} credential is missing required scopes: ${context.requiredScopes.join(', ')}`, context);
        this.availableScopes = availableScopes;
    }
    toJSON() {
        return { ...super.toJSON(), availableScopes: this.availableScopes };
    }
}
exports.CredentialMissingScopeError = CredentialMissingScopeError;
class CredentialExpiredError extends CredentialError {
    constructor(context) {
        super('CredentialExpired', `${context.provider} credential expired and could not be refreshed`, context);
    }
}
exports.CredentialExpiredError = CredentialExpiredError;
class CredentialRefreshError extends CredentialError {
    constructor(context) {
        super('CredentialRefreshFailed', `${context.provider} credential refresh failed`, context);
    }
}
exports.CredentialRefreshError = CredentialRefreshError;
class CredentialStorageError extends CredentialError {
    constructor(context) {
        const cause = context.causeMessage ? `: ${context.causeMessage}` : '';
        super('CredentialStorageError', `${context.provider} credential storage failed${cause}`, context);
    }
}
exports.CredentialStorageError = CredentialStorageError;
class CredentialUserIdError extends CredentialError {
    constructor(context) {
        super('CredentialUserIdError', `Could not normalize credential user id for ${context.userId}`, context);
    }
}
exports.CredentialUserIdError = CredentialUserIdError;
function credentialFixMessage(provider, scopes) {
    const scopeLabel = scopes.length > 0 ? ` and approve ${scopes.join(', ')}` : '';
    return `Reconnect your ${provider} account${scopeLabel}.`;
}
