"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeFixes = exports.inferIndentFromLine = exports.lineTextAt = exports.posToOffset = exports.applyEdits = exports.toJsonResult = exports.textReport = exports.offsetErrors = exports.extractMermaidBlocks = exports.validateSequence = exports.validatePie = exports.validateFlowchart = exports.detectDiagramType = exports.validate = void 0;
exports.fixText = fixText;
// Core validators and helpers
var router_js_1 = require("./core/router.js");
Object.defineProperty(exports, "validate", { enumerable: true, get: function () { return router_js_1.validate; } });
Object.defineProperty(exports, "detectDiagramType", { enumerable: true, get: function () { return router_js_1.detectDiagramType; } });
var validate_js_1 = require("./diagrams/flowchart/validate.js");
Object.defineProperty(exports, "validateFlowchart", { enumerable: true, get: function () { return validate_js_1.validateFlowchart; } });
var validate_js_2 = require("./diagrams/pie/validate.js");
Object.defineProperty(exports, "validatePie", { enumerable: true, get: function () { return validate_js_2.validatePie; } });
var validate_js_3 = require("./diagrams/sequence/validate.js");
Object.defineProperty(exports, "validateSequence", { enumerable: true, get: function () { return validate_js_3.validateSequence; } });
var markdown_js_1 = require("./core/markdown.js");
Object.defineProperty(exports, "extractMermaidBlocks", { enumerable: true, get: function () { return markdown_js_1.extractMermaidBlocks; } });
Object.defineProperty(exports, "offsetErrors", { enumerable: true, get: function () { return markdown_js_1.offsetErrors; } });
// Formatting and edits
var format_js_1 = require("./core/format.js");
Object.defineProperty(exports, "textReport", { enumerable: true, get: function () { return format_js_1.textReport; } });
Object.defineProperty(exports, "toJsonResult", { enumerable: true, get: function () { return format_js_1.toJsonResult; } });
var edits_js_1 = require("./core/edits.js");
Object.defineProperty(exports, "applyEdits", { enumerable: true, get: function () { return edits_js_1.applyEdits; } });
Object.defineProperty(exports, "posToOffset", { enumerable: true, get: function () { return edits_js_1.posToOffset; } });
Object.defineProperty(exports, "lineTextAt", { enumerable: true, get: function () { return edits_js_1.lineTextAt; } });
Object.defineProperty(exports, "inferIndentFromLine", { enumerable: true, get: function () { return edits_js_1.inferIndentFromLine; } });
// Auto-fixes
var fixes_js_1 = require("./core/fixes.js");
Object.defineProperty(exports, "computeFixes", { enumerable: true, get: function () { return fixes_js_1.computeFixes; } });
const router_js_2 = require("./core/router.js");
const fixes_js_2 = require("./core/fixes.js");
const edits_js_2 = require("./core/edits.js");
/**
 * Run validation and repeatedly apply computed fixes until stable (max 5 passes).
 * Returns the final fixed text and the remaining diagnostics after fixes.
 */
function fixText(text, options = {}) {
    const { strict = false, level = 'safe' } = options;
    let current = text;
    for (let i = 0; i < 5; i++) {
        const res = (0, router_js_2.validate)(current, { strict });
        const edits = (0, fixes_js_2.computeFixes)(current, res.errors, level);
        if (edits.length === 0)
            return { fixed: current, errors: res.errors };
        const next = (0, edits_js_2.applyEdits)(current, edits);
        if (next === current)
            return { fixed: current, errors: res.errors };
        current = next;
    }
    const finalRes = (0, router_js_2.validate)(current, { strict });
    return { fixed: current, errors: finalRes.errors };
}
