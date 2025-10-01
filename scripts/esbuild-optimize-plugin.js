// Custom esbuild plugin for aggressive optimizations

export const optimizePlugin = {
  name: 'optimize',
  setup(build) {
    // Replace string constants with numbers
    const stringMap = new Map([
      ['flowchart', '0'],
      ['sequence', '1'],
      ['pie', '2'],
      ['error', '3'],
      ['warning', '4'],
      ['TD', '5'],
      ['LR', '6'],
      ['BT', '7'],
      ['RL', '8']
    ]);

    // Transform JavaScript files
    build.onLoad({ filter: /\.js$/ }, async (args) => {
      const fs = require('fs');
      let contents = await fs.promises.readFile(args.path, 'utf8');

      // 1. Inline small functions (marked with /*#__INLINE__*/)
      contents = contents.replace(
        /\/\*#__INLINE__\*\/\s*function\s+(\w+)\s*\([^)]*\)\s*{([^}]+)}/g,
        (match, name, body) => {
          // Store for later inlining
          return match;
        }
      );

      // 2. Remove debug code in production
      contents = contents.replace(
        /if\s*\(\s*process\.env\.NODE_ENV\s*!==?\s*['"]production['"]\s*\)\s*{[^}]+}/g,
        ''
      );

      // 3. Optimize string constants (careful not to break code)
      // This is risky and needs careful testing
      /*
      for (const [str, num] of stringMap) {
        const regex = new RegExp(`['"]${str}['"]`, 'g');
        contents = contents.replace(regex, num);
      }
      */

      // 4. Remove unnecessary whitespace from template literals
      contents = contents.replace(/`\s+/g, '`');
      contents = contents.replace(/\s+`/g, '`');

      // 5. Convert const to let where beneficial (slightly smaller)
      contents = contents.replace(/\bconst\s+/g, 'let ');

      // 6. Shorten common method names in private contexts
      contents = contents.replace(/_validateInternal/g, '_v');
      contents = contents.replace(/_processNode/g, '_pn');
      contents = contents.replace(/_handleError/g, '_he');

      return { contents, loader: 'js' };
    });

    // Mark pure functions for better tree-shaking
    build.onLoad({ filter: /\.js$/ }, async (args) => {
      const fs = require('fs');
      let contents = await fs.promises.readFile(args.path, 'utf8');

      // Mark utility functions as pure
      const pureFunctions = [
        'createToken',
        'makeError',
        'formatMessage',
        'validateNode',
        'extractText'
      ];

      for (const func of pureFunctions) {
        const regex = new RegExp(`(${func}\\s*\\()`, 'g');
        contents = contents.replace(regex, '/*#__PURE__*/ $1');
      }

      return { contents, loader: 'js' };
    });
  }
};

// Dead code elimination plugin
export const deadCodePlugin = {
  name: 'dead-code',
  setup(build) {
    build.onLoad({ filter: /\.js$/ }, async (args) => {
      const fs = require('fs');
      let contents = await fs.promises.readFile(args.path, 'utf8');

      // Remove empty blocks
      contents = contents.replace(/{\s*}/g, '{}');

      // Remove consecutive semicolons
      contents = contents.replace(/;+/g, ';');

      // Remove unreachable code after return/throw
      contents = contents.replace(
        /return[^;]*;[^}]*/g,
        (match) => match.split(';')[0] + ';'
      );

      return { contents, loader: 'js' };
    });
  }
};

// Constant folding plugin
export const constantFoldingPlugin = {
  name: 'constant-folding',
  setup(build) {
    build.onLoad({ filter: /\.js$/ }, async (args) => {
      const fs = require('fs');
      let contents = await fs.promises.readFile(args.path, 'utf8');

      // Fold simple arithmetic
      contents = contents.replace(/(\d+)\s*\*\s*(\d+)/g, (m, a, b) => String(a * b));
      contents = contents.replace(/(\d+)\s*\+\s*(\d+)/g, (m, a, b) => String(Number(a) + Number(b)));

      // Fold simple boolean expressions
      contents = contents.replace(/true\s*&&\s*(.+?)(?=[;,\)])/g, '$1');
      contents = contents.replace(/false\s*&&\s*(.+?)(?=[;,\)])/g, 'false');
      contents = contents.replace(/true\s*\|\|\s*(.+?)(?=[;,\)])/g, 'true');
      contents = contents.replace(/false\s*\|\|\s*(.+?)(?=[;,\)])/g, '$1');

      return { contents, loader: 'js' };
    });
  }
};