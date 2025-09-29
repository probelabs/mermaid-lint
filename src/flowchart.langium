grammar Flowchart

// Entry point
entry FlowchartDiagram:
    type=DiagramType
    statements+=Statement*;

DiagramType:
    'graph' direction=Direction |
    'flowchart' direction=Direction;

Direction returns string:
    'TD' | 'TB' | 'BT' | 'RL' | 'LR';

Statement:
    NodeDefinition | 
    LinkStatement |
    SubgraphDefinition |
    ClassDefinition |
    StyleDefinition |
    Comment;

// Node definitions
NodeDefinition:
    id=NodeId shape=NodeShape?;

NodeId returns string:
    ID;

NodeShape:
    SquareBrackets |
    RoundBrackets |
    Diamond |
    Hexagon |
    Parallelogram |
    Trapezoid |
    Circle |
    DoubleCircle |
    Asymmetric |
    Cylinder |
    Stadium;

SquareBrackets:
    '[' content=NodeContent ']';

RoundBrackets:
    '(' content=NodeContent ')';

Diamond:
    '{' content=NodeContent '}';

Hexagon:
    '{{' content=NodeContent '}}';

Parallelogram:
    '[/' content=NodeContent '/]';

Trapezoid:
    '[\\' content=NodeContent '\\]';

Circle:
    '((' content=NodeContent '))';

DoubleCircle:
    '(((' content=NodeContent ')))';

Asymmetric:
    '>' content=NodeContent ']';

Cylinder:
    '[(' content=NodeContent ')]';

Stadium:
    '([' content=NodeContent '])';

NodeContent returns string:
    QuotedString | UnquotedText;

QuotedString returns string:
    STRING;

UnquotedText returns string:
    TEXT;

// Links
LinkStatement:
    from=NodeRef link=Link to=NodeRef linkText=LinkText?;

NodeRef:
    id=ID;

Link returns string:
    ArrowLink | DottedLink | ThickLink;

ArrowLink returns string:
    '-->' | '--->' | '---->' |
    '<--' | '<---' | '<----' |
    '---' | '----' | '-----';

DottedLink returns string:
    '-.->' | '-..->' | '-...->' |
    '<-.-' | '<-..-' | '<-...-' |
    '-.-' | '-..-' | '-...-';

ThickLink returns string:
    '==>' | '===>' | '====>' |
    '<==' | '<===' | '<====' |
    '===' | '====' | '=====';

LinkText:
    '|' text=NodeContent '|';

// Subgraphs
SubgraphDefinition:
    'subgraph' id=ID? title=NodeContent?
        statements+=Statement*
    'end';

// Styling
ClassDefinition:
    'classDef' name=ID styles=StyleList;

StyleDefinition:
    'style' target=ID styles=StyleList;

StyleList:
    styles+=StylePair (',' styles+=StylePair)*;

StylePair:
    key=ID ':' value=StyleValue;

StyleValue returns string:
    STRING | ID | COLOR | NUMBER;

// Comments
Comment:
    content=COMMENT;

// Terminals
terminal ID: /[a-zA-Z_][a-zA-Z0-9_-]*/;
terminal STRING: /"[^"]*"|'[^']*'/;
terminal TEXT: /[^[\](){}|<>\n]+/;
terminal COLOR: /#[0-9a-fA-F]{3,6}/;
terminal NUMBER: /[0-9]+(\.[0-9]+)?/;
terminal COMMENT: /%%[^\n]*/;

// Hidden terminals (whitespace)
hidden terminal WS: /\s+/;
hidden terminal NL: /[\r\n]+/;