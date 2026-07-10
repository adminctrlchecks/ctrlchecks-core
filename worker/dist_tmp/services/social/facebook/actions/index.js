"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveFacebookOperationHandler = resolveFacebookOperationHandler;
const PageList_operation_1 = require("./page/PageList.operation");
const not_implemented_operation_1 = require("./not-implemented.operation");
const handlerMap = {
    'page.getAllPages': PageList_operation_1.executePageListOperation,
};
function resolveFacebookOperationHandler(params) {
    const key = `${params.resource}.${params.operation}`;
    return handlerMap[key] ?? not_implemented_operation_1.notImplementedOperation;
}
