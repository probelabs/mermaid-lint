import { ValidationAcceptor, ValidationChecks } from 'langium';
import { FlowchartAstType, FlowchartDiagram, LinkStatement, NodeDefinition, SubgraphDefinition } from './generated/ast.js';
import type { FlowchartServices } from './generated/module.js';

export function registerValidationChecks(services: FlowchartServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = new FlowchartValidator(services);
    const checks: ValidationChecks<FlowchartAstType> = {
        FlowchartDiagram: validator.checkDiagram,
        LinkStatement: validator.checkLink,
        NodeDefinition: validator.checkNode,
        SubgraphDefinition: validator.checkSubgraph
    };
    registry.register(checks, validator);
}

export class FlowchartValidator {
    private definedNodes = new Set<string>();
    private referencedNodes = new Set<string>();
    private subgraphIds = new Set<string>();

    constructor(private services: FlowchartServices) {}

    checkDiagram = (diagram: FlowchartDiagram, accept: ValidationAcceptor): void => {
        // Reset tracking sets
        this.definedNodes.clear();
        this.referencedNodes.clear();
        this.subgraphIds.clear();

        // Check direction
        const validDirections = ['TD', 'TB', 'BT', 'RL', 'LR'];
        if (!validDirections.includes(diagram.direction)) {
            accept('error', `Invalid direction: ${diagram.direction}. Must be one of: ${validDirections.join(', ')}`, {
                node: diagram,
                property: 'direction'
            });
        }

        // Check if diagram is empty (no statements)
        if (!diagram.statements || diagram.statements.length === 0) {
            accept('error', 'Empty diagram - must contain at least one statement', {
                node: diagram
            });
        }

        // Collect all defined and referenced nodes
        diagram.statements.forEach(stmt => {
            if (stmt.$type === 'NodeDefinition') {
                const nodeDef = stmt as NodeDefinition;
                this.definedNodes.add(nodeDef.id);
            } else if (stmt.$type === 'LinkStatement') {
                const link = stmt as LinkStatement;
                if (link.from?.id) {
                    this.referencedNodes.add(link.from.id);
                    // Auto-define nodes referenced in links
                    this.definedNodes.add(link.from.id);
                }
                if (link.to?.id) {
                    this.referencedNodes.add(link.to.id);
                    // Auto-define nodes referenced in links
                    this.definedNodes.add(link.to.id);
                }
            } else if (stmt.$type === 'SubgraphDefinition') {
                const subgraph = stmt as SubgraphDefinition;
                // Process statements within subgraph
                if (subgraph.statements) {
                    subgraph.statements.forEach(subStmt => {
                        if (subStmt.$type === 'NodeDefinition') {
                            const nodeDef = subStmt as NodeDefinition;
                            this.definedNodes.add(nodeDef.id);
                        } else if (subStmt.$type === 'LinkStatement') {
                            const link = subStmt as LinkStatement;
                            if (link.from?.id) {
                                this.referencedNodes.add(link.from.id);
                                this.definedNodes.add(link.from.id);
                            }
                            if (link.to?.id) {
                                this.referencedNodes.add(link.to.id);
                                this.definedNodes.add(link.to.id);
                            }
                        }
                    });
                }
            }
        });

        // Check for orphaned nodes (defined but never used)
        // Note: This is actually allowed in Mermaid, so we won't error on it
    };

    checkLink = (link: LinkStatement, accept: ValidationAcceptor): void => {
        // Check arrow syntax
        const validArrows = [
            '-->', '--->', '---->', 
            '<--', '<---', '<----',
            '---', '----', '-----',
            '-.->', '-..->', '-...->', 
            '<-.-', '<-..-', '<-...-',
            '-.-', '-..-', '-...-',
            '==>', '===>', '====>', 
            '<==', '<===', '<====',
            '===', '====', '=====',
            '<-->', 'o--o', 'x--x'
        ];

        if (link.link && !validArrows.includes(link.link)) {
            accept('error', `Invalid arrow syntax: ${link.link}`, {
                node: link,
                property: 'link'
            });
        }

        // Check link text format (should be |text| if present)
        // This is handled by the grammar, but we can add additional checks if needed
    };

    checkNode = (node: NodeDefinition, accept: ValidationAcceptor): void => {
        // Check for invalid node ID patterns
        if (!node.id) {
            accept('error', 'Node must have an ID', {
                node: node
            });
        }

        // Check node shape matching
        if (node.shape) {
            // The grammar handles shape validation, but we can add semantic checks here
            // For example, checking for unclosed brackets is handled by the parser
        }
    };

    checkSubgraph = (subgraph: SubgraphDefinition, accept: ValidationAcceptor): void => {
        // Subgraph must have either ID or title
        if (!subgraph.id && !subgraph.title) {
            accept('error', 'Subgraph must have an ID or title', {
                node: subgraph
            });
        }

        // Check for duplicate subgraph IDs
        if (subgraph.id) {
            if (this.subgraphIds.has(subgraph.id)) {
                accept('error', `Duplicate subgraph ID: ${subgraph.id}`, {
                    node: subgraph,
                    property: 'id'
                });
            }
            this.subgraphIds.add(subgraph.id);
        }

        // Check that subgraph has content
        if (!subgraph.statements || subgraph.statements.length === 0) {
            accept('warning', 'Empty subgraph', {
                node: subgraph
            });
        }
    };
}