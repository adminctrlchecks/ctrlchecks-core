"use strict";
// PHASE-2: Safe Mode vs Fast Mode
// Two build modes with different validation levels
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildModeManager = exports.BuildModeManager = exports.BuildMode = void 0;
var BuildMode;
(function (BuildMode) {
    BuildMode["SAFE"] = "safe";
    BuildMode["FAST"] = "fast";
})(BuildMode || (exports.BuildMode = BuildMode = {}));
/**
 * Build Modes - PHASE-2 Feature #10
 *
 * Two build modes:
 * 🔒 Safe Mode (Default): Max validation, live test, slower
 * ⚡ Fast Mode: Pattern-only, skip live test, for advanced users
 */
class BuildModeManager {
    constructor() {
        this.SAFE_MODE = {
            mode: BuildMode.SAFE,
            skipLiveTest: false,
            skipRuntimeSimulation: false,
            maxValidationLayers: 5, // All layers
            requirePatternMatch: false,
            allowPartialBuild: false,
            description: 'Maximum validation and testing. Slower but more reliable.',
        };
        this.FAST_MODE = {
            mode: BuildMode.FAST,
            skipLiveTest: true,
            skipRuntimeSimulation: true,
            maxValidationLayers: 3, // Only structural, config, credentials
            requirePatternMatch: true, // Must have pattern match
            allowPartialBuild: true, // Allow partial builds
            description: 'Pattern-based fast build. Skips live testing. For advanced users.',
        };
    }
    /**
     * Get build mode configuration
     */
    getConfig(mode = BuildMode.SAFE) {
        return mode === BuildMode.FAST ? this.FAST_MODE : this.SAFE_MODE;
    }
    /**
     * Validate if mode is appropriate for workflow
     */
    validateMode(mode, workflowComplexity) {
        // Fast mode not recommended for complex workflows
        if (mode === BuildMode.FAST && workflowComplexity === 'complex') {
            return {
                valid: false,
                recommendation: BuildMode.SAFE,
                reason: 'Fast mode is not recommended for complex workflows. Use Safe mode for better reliability.',
            };
        }
        return { valid: true };
    }
}
exports.BuildModeManager = BuildModeManager;
// Export singleton instance
exports.buildModeManager = new BuildModeManager();
