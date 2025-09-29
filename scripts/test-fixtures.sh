#!/bin/bash

echo "Testing Flowchart Diagrams"
echo "=========================="
node scripts/compare-linters.js flowchart

echo ""
echo "To test other diagram types when available:"
echo "  node scripts/compare-linters.js <diagram-type>"
echo ""
echo "Available types will include: flowchart, sequence, class, state, etc."