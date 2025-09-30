"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractMermaidBlocks = extractMermaidBlocks;
exports.offsetErrors = offsetErrors;
const FENCE_RE = /^(\s{0,3})(`{3,}|~{3,})\s*([^\n`]*)?\s*$/;
function isMermaidInfo(info) {
    if (!info)
        return false;
    const lang = (info.split(/\s+/)[0] || '').toLowerCase();
    return lang === 'mermaid' || lang === 'mmd' || lang === 'mermaidjs';
}
function extractMermaidBlocks(text) {
    const lines = text.split(/\r?\n/);
    const blocks = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const m = FENCE_RE.exec(line);
        if (m) {
            const fence = m[2];
            const info = (m[3] || '').trim();
            if (isMermaidInfo(info)) {
                // Capture until closing fence of the same marker (backticks vs tildes, any length >= opening length)
                const fenceChar = fence[0];
                const minLen = fence.length;
                const contentLines = [];
                const startLine = i + 2; // 1-based, first content line after the opening fence
                i++;
                let closed = false;
                for (; i < lines.length; i++) {
                    const l = lines[i];
                    const closeMatch = new RegExp(`^\\s{0,3}${fenceChar}{${minLen},}\\s*$`).exec(l);
                    if (closeMatch) {
                        closed = true;
                        break; // i points at the closing fence line
                    }
                    contentLines.push(l);
                }
                const endLine = closed ? (i + 1) : (lines.length + 1);
                blocks.push({ content: contentLines.join('\n'), startLine, endLine, info, fence });
                // If closed, advance past the closing fence. If not, we are at EOF.
                if (closed)
                    i++; // move to the line after closing fence
                continue;
            }
        }
        i++;
    }
    return blocks;
}
function offsetErrors(errors, lineOffset) {
    if (!lineOffset)
        return errors;
    return errors.map(e => ({ ...e, line: e.line + lineOffset }));
}
