import type { CstNode, IToken } from 'chevrotain';
import type { Node, Edge, Graph, NodeShape, ArrowType, Direction, Subgraph } from './types.js';

/**
 * Transforms a Chevrotain CST into a graph model suitable for rendering
 */
export class GraphBuilder {
  private nodes: Map<string, Node> = new Map();
  private edges: Edge[] = [];
  private nodeCounter = 0;
  private edgeCounter = 0;
  private subgraphs: Subgraph[] = [];
  private currentSubgraph: string | undefined;

  build(cst: CstNode | undefined): Graph {
    this.reset();

    // Handle undefined CST (parser errors)
    if (!cst || !cst.children) {
      return {
        nodes: [],
        edges: [],
        direction: 'TD',
        subgraphs: []
      };
    }

    const direction = this.extractDirection(cst);
    this.processStatements(cst);

    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      direction,
      subgraphs: this.subgraphs
    };
  }

  private reset() {
    this.nodes.clear();
    this.edges = [];
    this.nodeCounter = 0;
    this.edgeCounter = 0;
    this.subgraphs = [];
    this.currentSubgraph = undefined;
  }

  private extractDirection(cst: CstNode): Direction {
    const dirToken = cst.children?.Direction?.[0] as IToken | undefined;
    const dir = dirToken?.image?.toUpperCase();

    switch (dir) {
      case 'TB':
      case 'TD': return 'TD';
      case 'BT': return 'BT';
      case 'LR': return 'LR';
      case 'RL': return 'RL';
      default: return 'TD';
    }
  }

  private processStatements(cst: CstNode) {
    const statements = cst.children?.statement as CstNode[] | undefined;
    if (!statements) return;

    for (const stmt of statements) {
      if (stmt.children?.nodeStatement) {
        this.processNodeStatement(stmt.children.nodeStatement[0] as CstNode);
      } else if (stmt.children?.subgraph) {
        this.processSubgraph(stmt.children.subgraph[0] as CstNode);
      }
      // Skip class, style, and other statements for now
    }
  }

  private processNodeStatement(stmt: CstNode) {
    const groups = stmt.children?.nodeOrParallelGroup as CstNode[] | undefined;
    const links = stmt.children?.link as CstNode[] | undefined;

    if (!groups || groups.length === 0) return;

    // Process first group of nodes
    const sourceNodes = this.processNodeGroup(groups[0]);

    if (groups.length > 1 && links && links.length > 0) {
      // Has connections
      const targetNodes = this.processNodeGroup(groups[1]);
      const linkInfo = this.extractLinkInfo(links[0]);

      // Create edges from all source nodes to all target nodes
      for (const source of sourceNodes) {
        for (const target of targetNodes) {
          this.edges.push({
            id: `e${this.edgeCounter++}`,
            source,
            target,
            label: linkInfo.label,
            type: linkInfo.type
          });
        }
      }

      // Process chain (A --> B --> C)
      for (let i = 2; i < groups.length; i++) {
        const nextNodes = this.processNodeGroup(groups[i]);
        const nextLink = links[i - 1] ? this.extractLinkInfo(links[i - 1]) : linkInfo;

        for (const source of targetNodes) {
          for (const target of nextNodes) {
            this.edges.push({
              id: `e${this.edgeCounter++}`,
              source,
              target,
              label: nextLink.label,
              type: nextLink.type
            });
          }
        }
        targetNodes.length = 0;
        targetNodes.push(...nextNodes);
      }
    }
  }

  private processNodeGroup(group: CstNode): string[] {
    const nodes = group.children?.node as CstNode[] | undefined;
    if (!nodes) return [];

    const nodeIds: string[] = [];

    for (const node of nodes) {
      const nodeInfo = this.extractNodeInfo(node);
      if (nodeInfo) {
        // Check if this ID is a subgraph - if so, don't add as a node
        const isSubgraph = this.subgraphs.some(sg => sg.id === nodeInfo.id);

        if (!isSubgraph) {
          // Add or update node only if it's not a subgraph
          if (!this.nodes.has(nodeInfo.id)) {
            this.nodes.set(nodeInfo.id, nodeInfo);
          } else if (nodeInfo.label || nodeInfo.shape !== 'rectangle') {
            // Update existing node if it has more info
            const existing = this.nodes.get(nodeInfo.id)!;
            if (nodeInfo.label) existing.label = nodeInfo.label;
            if (nodeInfo.shape !== 'rectangle') existing.shape = nodeInfo.shape;
          }

          // Track subgraph membership
          if (this.currentSubgraph) {
            const subgraph = this.subgraphs.find(s => s.id === this.currentSubgraph);
            if (subgraph && !subgraph.nodes.includes(nodeInfo.id)) {
              subgraph.nodes.push(nodeInfo.id);
            }
          }
        }

        // Always add to nodeIds for edge creation (subgraph edges are valid)
        nodeIds.push(nodeInfo.id);
      }
    }

    return nodeIds;
  }

  private extractNodeInfo(node: CstNode): Node | null {
    const children = node.children;
    if (!children) return null;

    // Extract node ID
    let id: string;
    if (children.nodeId) {
      id = (children.nodeId[0] as IToken).image;
      if (children.nodeIdSuffix) {
        id += (children.nodeIdSuffix[0] as IToken).image;
      }
    } else if (children.nodeIdNum) {
      id = (children.nodeIdNum[0] as IToken).image;
    } else if (children.Identifier) {
      id = (children.Identifier[0] as IToken).image;
    } else {
      return null;
    }

    // Extract shape and label
    let shape: NodeShape = 'rectangle';
    let label = id; // Default label is the ID

    const shapeNode = children.nodeShape?.[0] as CstNode | undefined;
    if (shapeNode?.children) {
      const result = this.extractShapeAndLabel(shapeNode);
      shape = result.shape;
      if (result.label) label = result.label;
    }

    return { id, label, shape };
  }

  private extractShapeAndLabel(shapeNode: CstNode): { shape: NodeShape; label: string } {
    const children = shapeNode.children;
    let shape: NodeShape = 'rectangle';
    let label = '';

    // Detect shape based on opening token
    if (children?.SquareOpen) {
      shape = 'rectangle';
    } else if (children?.RoundOpen) {
      shape = 'round';
    } else if (children?.DiamondOpen) {
      shape = 'diamond';
    } else if (children?.DoubleRoundOpen) {
      shape = 'circle';
    } else if (children?.StadiumOpen) {
      shape = 'stadium';
    } else if (children?.HexagonOpen) {
      shape = 'hexagon';
    } else if (children?.DoubleSquareOpen) {
      shape = 'subroutine';
    } else if (children?.CylinderOpen) {
      shape = 'cylinder';
    } else if (children?.TrapezoidOpen) {
      shape = 'trapezoid';
    } else if (children?.ParallelogramOpen) {
      shape = 'parallelogram';
    }

    // Extract label from content
    const contentNodes = children?.nodeContent as CstNode[] | undefined;
    if (contentNodes && contentNodes.length > 0) {
      label = this.extractTextContent(contentNodes[0]);
    }

    return { shape, label };
  }

  private extractTextContent(contentNode: CstNode): string {
    const children = contentNode.children;
    if (!children) return '';

    const parts: string[] = [];

    // Collect all text tokens
    const tokenTypes = ['Identifier', 'QuotedString', 'NumberLiteral', 'Ampersand',
                       'Comma', 'Colon', 'Semicolon', 'Dot', 'Underscore', 'Dash'];

    for (const type of tokenTypes) {
      const tokens = children[type] as IToken[] | undefined;
      if (tokens) {
        for (const token of tokens) {
          let text = token.image;
          // Remove quotes from quoted strings
          if (type === 'QuotedString' && text.startsWith('"') && text.endsWith('"')) {
            text = text.slice(1, -1);
          }
          parts.push(text);
        }
      }
    }

    // Handle spaces
    if (children.Space) {
      // If we have explicit spaces, use them
      return parts.join('');
    }

    // Otherwise join with spaces
    return parts.join(' ').trim();
  }

  private extractLinkInfo(link: CstNode): { type: ArrowType; label?: string } {
    const children = link.children;
    let type: ArrowType = 'arrow';
    let label: string | undefined;

    // Determine arrow type
    if (children?.ArrowRight || children?.ArrowLeft) {
      type = 'arrow';
    } else if (children?.DottedArrowRight || children?.DottedArrowLeft) {
      type = 'dotted';
    } else if (children?.ThickArrowRight || children?.ThickArrowLeft) {
      type = 'thick';
    } else if (children?.LinkRight || children?.LinkLeft) {
      type = 'open';
    } else if (children?.InvisibleLink) {
      type = 'invisible';
    }

    // Extract link label
    const textNode = children?.linkText?.[0] as CstNode | undefined;
    if (textNode) {
      label = this.extractTextContent(textNode);
    }

    return { type, label };
  }

  private processSubgraph(subgraph: CstNode) {
    const children = subgraph.children;

    // Extract subgraph ID and label
    let id = `subgraph_${this.subgraphs.length}`;
    let label: string | undefined;

    // Check for subgraphId token
    const idToken = (children?.subgraphId?.[0] || children?.Identifier?.[0]) as IToken | undefined;
    if (idToken) {
      id = idToken.image;
    }

    // Label can be in square brackets (like node shape) or in subgraphLabel
    if (children?.SquareOpen && children?.nodeContent) {
      // Format: subgraph id[Label]
      label = this.extractTextContent(children.nodeContent[0] as CstNode);
    } else if (children?.subgraphLabel) {
      // Format: subgraph id Label (without brackets)
      label = this.extractTextContent(children.subgraphLabel[0] as CstNode);
    }

    // If no explicit label was found, use the ID as the label
    if (!label && id !== `subgraph_${this.subgraphs.length}`) {
      label = id;
    }

    // Create subgraph
    const sg: Subgraph = {
      id,
      label,
      nodes: [],
      parent: this.currentSubgraph
    };

    this.subgraphs.push(sg);

    // Process statements within subgraph
    const prevSubgraph = this.currentSubgraph;
    this.currentSubgraph = id;

    const statements = children?.subgraphStatement as CstNode[] | undefined;
    if (statements) {
      for (const stmt of statements) {
        if (stmt.children?.nodeStatement) {
          this.processNodeStatement(stmt.children.nodeStatement[0] as CstNode);
        } else if (stmt.children?.subgraph) {
          this.processSubgraph(stmt.children.subgraph[0] as CstNode);
        }
      }
    }

    this.currentSubgraph = prevSubgraph;
  }
}