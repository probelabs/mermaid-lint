// Ultra-minimal browser entry point - validation and rendering only
// For sites that just want to validate and render, no fixing

export type { ValidationError, DiagramType } from './core/types.js';

// Just validation
export { validate, detectDiagramType } from './core/router.js';

// Just rendering
export { renderMermaid } from './renderer/index.js';
export type { RenderOptions, RenderResult } from './renderer/index.js';

// That's it! No fixing, no markdown, no CLI utilities