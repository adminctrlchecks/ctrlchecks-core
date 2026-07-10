"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWithGeminiWalletContext = runWithGeminiWalletContext;
exports.getGeminiWalletContext = getGeminiWalletContext;
const async_hooks_1 = require("async_hooks");
const walletContext = new async_hooks_1.AsyncLocalStorage();
function runWithGeminiWalletContext(context, fn) {
    return walletContext.run(context, fn);
}
function getGeminiWalletContext() {
    return walletContext.getStore();
}
