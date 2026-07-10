"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInSandbox = runInSandbox;
/**
 * Secure JavaScript sandbox using worker_threads + vm.runInContext.
 *
 * Two-layer isolation:
 *   1. vm.createContext – restricts globals (no require, process, fs, etc.)
 *   2. Worker thread    – memory and module isolation from the main process
 *
 * Replaces vm2 (officially abandoned Apr 2023, critical CVEs 2022-2024).
 */
const worker_threads_1 = require("worker_threads");
// Inline worker script — runs in a fresh Node.js worker thread.
// Only worker_threads and vm are required; user code cannot reach require().
const WORKER_SCRIPT = `
'use strict';
const { workerData, parentPort } = require('worker_threads');
const vm = require('vm');

const { code, vars, nodeOutputsSnapshot, timeout } = workerData;

// Build the sandbox — vm.createContext populates standard globals automatically.
// We only inject user-supplied data + limited console + getNodeOutput helper.
const sandbox = Object.assign({}, vars || {}, {
  console: {
    log:   (...a) => parentPort.postMessage({ t: 'log', a }),
    error: (...a) => parentPort.postMessage({ t: 'log', a }),
    warn:  (...a) => parentPort.postMessage({ t: 'log', a }),
  },
  getNodeOutput: (nodeId) => {
    const out = (nodeOutputsSnapshot || {})[String(nodeId)];
    if (out == null) return undefined;
    try { return JSON.parse(JSON.stringify(out)); } catch { return undefined; }
  },
});

try {
  const ctx = vm.createContext(sandbox);
  const result = vm.runInContext(code, ctx, { timeout, breakOnSigint: true });
  parentPort.postMessage({ t: 'ok', v: result });
} catch (err) {
  parentPort.postMessage({ t: 'err', m: err instanceof Error ? err.message : String(err) });
}
`;
/**
 * Run JavaScript code in a sandboxed worker thread.
 *
 * @returns The value produced by the code (must be JSON-serializable for transfer).
 * @throws  On timeout, security violation, or runtime error.
 */
function runInSandbox(opts) {
    const { code, vars, nodeOutputsSnapshot, timeout, label = 'Sandbox' } = opts;
    // Serialize everything — worker boundary enforces JSON transfer.
    let safeVars;
    try {
        safeVars = JSON.parse(JSON.stringify(vars ?? {}));
    }
    catch {
        safeVars = {};
    }
    let safeOutputs;
    if (nodeOutputsSnapshot) {
        try {
            safeOutputs = JSON.parse(JSON.stringify(nodeOutputsSnapshot));
        }
        catch {
            safeOutputs = {};
        }
    }
    return new Promise((resolve, reject) => {
        let settled = false;
        const settle = (fn) => {
            if (!settled) {
                settled = true;
                fn();
            }
        };
        const worker = new worker_threads_1.Worker(WORKER_SCRIPT, {
            eval: true,
            workerData: { code, vars: safeVars, nodeOutputsSnapshot: safeOutputs, timeout },
        });
        // Hard kill if the vm timeout doesn't fire (e.g. native blocking calls).
        const timer = setTimeout(() => {
            worker.terminate().catch(() => { });
            settle(() => reject(new Error(`Script execution timed out after ${timeout}ms`)));
        }, timeout + 2000);
        worker.on('message', (msg) => {
            if (msg.t === 'log') {
                console.log(`[${label}]`, ...(msg.a ?? []));
            }
            else if (msg.t === 'ok') {
                clearTimeout(timer);
                worker.terminate().catch(() => { });
                settle(() => resolve(msg.v));
            }
            else if (msg.t === 'err') {
                clearTimeout(timer);
                worker.terminate().catch(() => { });
                settle(() => reject(new Error(msg.m ?? 'Sandbox error')));
            }
        });
        worker.on('error', (err) => {
            clearTimeout(timer);
            settle(() => reject(err));
        });
        worker.on('exit', () => {
            clearTimeout(timer);
            settle(() => reject(new Error('Sandbox worker exited unexpectedly')));
        });
    });
}
