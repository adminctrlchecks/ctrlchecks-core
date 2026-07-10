"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notImplementedOperation = notImplementedOperation;
const ErrorHandler_helper_1 = require("../shared/ErrorHandler.helper");
async function notImplementedOperation(params) {
    throw new ErrorHandler_helper_1.FacebookNotYetImplementedError(params.resource, params.operation);
}
