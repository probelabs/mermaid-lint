#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runMermaidCli(filepath) {
  // mermaid-cli sometimes exits 0 but emits an "error SVG". Detect that.
  const outSvg = `/tmp/mermaid-cli-${path.basename(filepath)}.svg`;
  try {
    const puppeteerCfg = path.resolve(__dirname, 'puppeteer-ci.json');
    const pFlag = fs.existsSync(puppeteerCfg) ? ` -p "${puppeteerCfg}"` : '';
    execSync(`npx @mermaid-js/mermaid-cli${pFlag} -i "${filepath}" -o "${outSvg}"`, {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 12000,
    });
  } catch (error) {
    const raw = (error.stderr || error.stdout || error.message || '').toString();
    const msg = sanitizeMermaidMessage(raw);
    try { fs.unlinkSync(outSvg); } catch {}
    return { valid: false, message: msg.trim() || 'INVALID (no message)' };
  }

  // Exit code was 0; inspect SVG for error markers
  try {
    const svg = fs.readFileSync(outSvg, 'utf8');
    // Mermaid renders error pages with aria-roledescription="error" and error-text classes
    const isError = /aria-roledescription\s*=\s*"error"/.test(svg) || /class=\"error-text\"/.test(svg);
    if (isError) {
      // Try to extract the first error-text message
      const texts = Array.from(svg.matchAll(/<text[^>]*class=\"error-text\"[^>]*>([^<]*)<\/text>/g)).map(m => m[1].trim()).filter(Boolean);
      const message = texts[0] || 'Syntax error (from mermaid-cli error SVG)';
      try { fs.unlinkSync(outSvg); } catch {}
      return { valid: false, message };
    }
    try { fs.unlinkSync(outSvg); } catch {}
    return { valid: true, message: 'VALID' };
  } catch {
    // If we can't read the file, assume invalid
    try { fs.unlinkSync(outSvg); } catch {}
    return { valid: false, message: 'INVALID (could not read output SVG)' };
  }
}

function runMermaidCliOnContent(content, suffix = 'fixed') {
  const tmp = `/tmp/maid-${suffix}-${Date.now()}-${Math.random().toString(36).slice(2)}.mmd`;
  fs.writeFileSync(tmp, content);
  const res = runMermaidCli(tmp);
  try { fs.unlinkSync(tmp); } catch {}
  return res;
}

function sanitizeMermaidMessage(input) {
  if (!input) return input;
  let out = input;
  // Collapse file:///.../node_modules/... -> node_modules/...
  out = out.replace(/file:\/\/[^\s)]+node_modules\/(.*?):(\d+):(\d+)/g, 'node_modules/$1:$2:$3');
  // Collapse /.../node_modules/... -> node_modules/...
  out = out.replace(/\/(?:[A-Za-z]:)?[^\s)]+node_modules\/(.*?):(\d+):(\d+)/g, 'node_modules/$1:$2:$3');
  // Normalize Windows paths with backslashes if any
  out = out.replace(/file:\/\/[A-Za-z]:\\[^\s)]+node_modules\\(.*?):(\d+):(\d+)/g, 'node_modules/$1:$2:$3');
  // Drop Node internal stack frames (vary across versions)
  out = out
    .split(/\r?\n/)
    .filter((line) => !/\s+at\s+.*\(node:internal\//.test(line))
    .join('\n');
  return out;
}

function runOurLinter(filepath) {
  try {
    const out = execSync(`node ./out/cli.js "${filepath}"`, {
      stdio: 'pipe',
      encoding: 'utf8',
      cwd: path.resolve(__dirname, '..'),
      timeout: 8000,
    });
    return { valid: true, message: stripAnsi(out.trim() || 'VALID') };
  } catch (error) {
    const raw = ((error.stdout || '') + (error.stderr || '')).toString();
    const repoRoot = path.resolve(__dirname, '..');
    const msg = stripAnsi(raw)
      .replaceAll(repoRoot + '/', '')
      .replaceAll(repoRoot + '\\', '')
      .trim();
    return { valid: false, message: msg || 'INVALID (no message)' };
  }
}

function runOurAutofixPreview(filepath, level = 'safe') {
  try {
    const flag = level === 'all' ? '--fix=all' : '--fix';
    const out = execSync(`node ./out/cli.js ${flag} --dry-run --print-fixed "${filepath}"`, {
      stdio: 'pipe',
      encoding: 'utf8',
      cwd: path.resolve(__dirname, '..'),
      timeout: 8000,
    });
    return { ok: true, fixed: out.toString() };
  } catch (error) {
    // Even if exit code is non-zero (remaining errors), stdout contains the fixed content we want.
    const stdout = (error.stdout || '').toString();
    if (stdout && stdout.trim()) {
      return { ok: true, fixed: stdout };
    }
    const msg = ((error.stderr || '')).toString();
    return { ok: false, fixed: '', error: stripAnsi(msg) };
  }
}

function generateInvalidMarkdown(diagramType = 'flowchart') {
  const fixturesDir = path.resolve(__dirname, '..', 'test-fixtures', diagramType);
  const invalidDir = path.join(fixturesDir, 'invalid');
  
  if (!fs.existsSync(invalidDir)) {
    console.error(`No invalid fixtures found for diagram type: ${diagramType}`);
    process.exit(1);
  }
  
  const invalidFiles = fs.readdirSync(invalidDir)
    .filter(f => f.endsWith('.mmd'))
    .sort();
  
  let markdown = `# Invalid ${diagramType.charAt(0).toUpperCase() + diagramType.slice(1)} Diagrams

This file contains invalid ${diagramType} test fixtures with:
- GitHub render attempts
- Error from mermaid-cli
- Error/output from our linter

> Note: Auto-generated by \`scripts/generate-invalid-preview.js\`. Do not edit manually.

## Table of Contents

`;

  // Prepare results by running both tools once per file
  const repoRoot = path.resolve(__dirname, '..');
  const results = invalidFiles.map((file, index) => {
    const filePath = path.join(invalidDir, file);
    const relPath = path.relative(repoRoot, filePath);
    const mermaidRes = runMermaidCli(relPath);
    const ourRes = runOurLinter(relPath);
    const fixPreviewSafe = runOurAutofixPreview(relPath, 'safe');
    const fixPreviewAll = runOurAutofixPreview(relPath, 'all');
    const orig = fs.readFileSync(filePath, 'utf8');
    const normalize = (s) => (s || '').toString().replace(/\r\n/g, '\n').trim();
    const origN = normalize(orig);
    const safeN = normalize(fixPreviewSafe.fixed);
    const allN = normalize(fixPreviewAll.fixed);
    const safeChanged = fixPreviewSafe.ok && safeN && safeN !== origN;
    const allChanged = fixPreviewAll.ok && allN && allN !== origN;
    const mmSafe = safeChanged ? runMermaidCliOnContent(fixPreviewSafe.fixed, 'safe-toc') : { valid: false };
    const mmAll = allChanged ? runMermaidCliOnContent(fixPreviewAll.fixed, 'all-toc') : { valid: false };
    return { file, index, filePath: relPath, mermaidRes, ourRes, fixPreviewSafe, fixPreviewAll, safeChanged, allChanged, mmSafe, mmAll };
  });

  // Generate table of contents
  results.forEach(({ file, index }) => {
    const name = file.replace('.mmd', '').replace(/-/g, ' ');
    const title = name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    markdown += `${index + 1}. [${title}](#${index + 1}-${file.replace('.mmd', '').toLowerCase()})\n`;
  });
  
  markdown += `\n---\n\n`;

  // Summary matrix (add Auto-fix column: shows if safe/all would change the file)
  markdown += `## Summary\n\n`;
  markdown += `| # | Diagram | mermaid-cli | maid | Auto-fix? |\n|---:|---|:---:|:---:|:---:|\n`;
  const normalize = (s) => (s || '').toString().replace(/\r\n/g, '\n').trim();
  results.forEach(({ file, index, mermaidRes, ourRes, fixPreviewSafe, fixPreviewAll, safeChanged, allChanged, mmSafe, mmAll }) => {
    const base = file.replace('.mmd', '');
    const name = base.replace(/-/g, ' ');
    const title = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const anchor = `#${index + 1}-${base.toLowerCase()}`;
    const mm = mermaidRes.valid ? 'VALID' : 'INVALID';
    const us = ourRes.valid ? 'VALID' : 'INVALID';
    let fixCol = '—';
    if (safeChanged) fixCol = (mmSafe.valid ? '✅ safe' : '❌ safe');
    else if (allChanged) fixCol = (mmAll.valid ? '✅ all' : '❌ all');
    markdown += `| ${index + 1} | [${title}](${anchor}) | ${mm} | ${us} | ${fixCol} |\n`;
  });
  markdown += `\n---\n\n`;
  
  // Generate diagram sections
  // Track fix validation failures (changed but still INVALID under mermaid-cli)
  const fixFailures = [];

  results.forEach(({ file, index, filePath, mermaidRes, ourRes, fixPreviewSafe, fixPreviewAll }) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const name = file.replace('.mmd', '').replace(/-/g, ' ');
    const title = name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    markdown += `## ${index + 1}. ${title}\n\n`;
    markdown += `📄 **Source**: [\`${file}\`](./invalid/${file})\n\n`;
    
    // Add error descriptions
    const errorDescriptions = {
      'duplicate-subgraph': '❌ **Error**: Duplicate subgraph IDs are not allowed.',
      'empty-diagram': '❌ **Error**: Diagram must contain at least one statement after declaration.',
      'invalid-arrow': '❌ **Error**: Single arrow `->` is invalid. Use `-->` instead.',
      'invalid-class': '❌ **Error**: Class statement requires both node ID(s) and class name.',
      'invalid-node-syntax': '❌ **Error**: Incomplete node syntax with unclosed brackets.',
      'invalid-subgraph': '❌ **Error**: Subgraph must have an ID or title.',
      'missing-arrow': '❌ **Error**: Nodes on the same line must be connected with arrows.',
      'mixed-brackets': '❌ **Error**: Mixing bracket types like `[text)` is not allowed.',
      'no-diagram-type': '❌ **Error**: Diagram must start with `graph` or `flowchart`.',
      'special-chars': '❌ **Error**: Escaped quotes with backslash not supported in node labels.',
      'unclosed-bracket': '❌ **Error**: All brackets must be properly closed.',
      'unmatched-end': '❌ **Error**: `end` keyword without matching `subgraph`.',
      'wrong-direction': '❌ **Error**: Invalid direction. Must be one of: TD, TB, BT, RL, LR.',
      'unquoted-label-with-quotes': '❌ **Error**: Label contains double quotes without quoting the whole label. Wrap the entire label in quotes or use &quot; for inner quotes.'
    };
    
    const key = file.replace('.mmd', '');
    if (errorDescriptions[key]) {
      markdown += `${errorDescriptions[key]}\n\n`;
    }
    
    // Add the Mermaid diagram (even though it's invalid, to see how GitHub renders it)
    markdown += `### GitHub Render Attempt\n\n`;
    markdown += `> **Note**: This invalid diagram may not render or may render incorrectly.\n\n`;
    markdown += `\`\`\`mermaid\n${content}\n\`\`\`\n\n`;

    markdown += `### mermaid-cli Result: ${mermaidRes.valid ? 'VALID' : 'INVALID'}\n\n`;
    if (!mermaidRes.valid) {
      markdown += `\`\`\`\n${mermaidRes.message}\n\`\`\`\n\n`;
    }

    markdown += `### maid Result: ${ourRes.valid ? 'VALID' : 'INVALID'}\n\n`;
    if (!ourRes.valid) {
      markdown += `\`\`\`\n${ourRes.message}\n\`\`\`\n\n`;
    }

    // Auto-fix preview (safe)
    markdown += `### maid Auto-fix (\`--fix\`) Preview\n\n`;
    const orig = fs.readFileSync(filePath, 'utf-8');
    if (fixPreviewSafe.ok && fixPreviewSafe.fixed.trim() && fixPreviewSafe.fixed.trim() !== orig.trim()) {
      // Validate the fixed output with mermaid-cli; fail later if still invalid
      const mmFixed = runMermaidCliOnContent(fixPreviewSafe.fixed, 'safe');
      if (!mmFixed.valid) {
        fixFailures.push({ file, level: 'safe', message: mmFixed.message });
      }
      markdown += `\`\`\`mermaid\n${fixPreviewSafe.fixed}\n\`\`\`\n\n`;
    } else {
      markdown += `No auto-fix changes (safe level).\n\n`;
    }

    // Auto-fix preview (all)
    markdown += `### maid Auto-fix (\`--fix=all\`) Preview\n\n`;
    if (fixPreviewAll.ok && fixPreviewAll.fixed.trim() && fixPreviewAll.fixed.trim() !== orig.trim()) {
      const mmFixedAll = runMermaidCliOnContent(fixPreviewAll.fixed, 'all');
      if (!mmFixedAll.valid) {
        fixFailures.push({ file, level: 'all', message: mmFixedAll.message });
      }
      markdown += `\`\`\`mermaid\n${fixPreviewAll.fixed}\n\`\`\`\n\n`;
    } else {
      markdown += `No auto-fix changes (all level).\n\n`;
    }

    // Add collapsible source code section
    markdown += `<details>\n`;
    markdown += `<summary>View source code</summary>\n\n`;
    markdown += `\`\`\`\n${content}\n\`\`\`\n`;
    markdown += `</details>\n\n`;
    
    markdown += `---\n\n`;
  });
  
  // Add footer (capture outputs; don't assert overall validity)
  markdown += `## Notes

This document captures outputs from both tools for each fixture. Use the summary table above to spot mismatches.

Generated by scripts/generate-invalid-preview.js (deterministic output)

## How to Regenerate

\`\`\`bash
node scripts/generate-invalid-preview.js ${diagramType}
\`\`\`
`;
  
  return { markdown, results, fixFailures };
}

// Remove ANSI color codes from strings for clean Markdown output
function stripAnsi(input) {
  if (!input) return input;
  // eslint-disable-next-line no-control-regex
  return input.replace(/\u001b\[[0-?]*[ -\/]*[@-~]/g, '');
}

function main() {
  const diagramType = process.argv[2] || 'flowchart';
  const outputPath = path.resolve(__dirname, '..', 'test-fixtures', diagramType, 'INVALID_DIAGRAMS.md');
  const invalidDir = path.resolve(__dirname, '..', 'test-fixtures', diagramType, 'invalid');
  
  console.log(`Generating invalid preview for ${diagramType} diagrams...`);
  
  // Build results once so we can also enforce classification consistency
  const fixturesDir = path.resolve(__dirname, '..', 'test-fixtures', diagramType, 'invalid');
  const repoRoot = path.resolve(__dirname, '..');
  const files = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.mmd')).sort();
  const mermaidMismatches = [];

  // Probe mermaid-cli on each invalid file
  const tmpResults = files.map((file) => {
    const abs = path.join(fixturesDir, file);
    const rel = path.relative(repoRoot, abs);
    const mer = runMermaidCli(rel);
    if (mer.valid) {
      mermaidMismatches.push({ file, message: mer.message });
    }
    return { file, rel, mer };
  });

  const { markdown, fixFailures } = generateInvalidMarkdown(diagramType);
  
  fs.writeFileSync(outputPath, markdown);
  
  const invalidFiles = fs.readdirSync(invalidDir).filter(f => f.endsWith('.mmd'));
  
  console.log(`✅ Generated invalid preview at: ${outputPath}`);
  console.log(`📊 Total invalid diagrams: ${invalidFiles.length}`);

  // Enforce: Every file in invalid/ must be INVALID by mermaid-cli
  if (mermaidMismatches.length) {
    console.error(`\n❌ Found ${mermaidMismatches.length} classification mismatch(es) in '${diagramType}/invalid':`);
    mermaidMismatches.forEach((m) => {
      console.error(` - ${m.file}: expected INVALID, but mermaid-cli says VALID`);
    });
    process.exit(1);
  }

  // Enforce: If our auto-fix changed the content, the fixed output must be VALID under mermaid-cli
  if (fixFailures.length) {
    console.error(`\n❌ Found ${fixFailures.length} auto-fix validation failure(s) in '${diagramType}/invalid':`);
    for (const f of fixFailures) {
      console.error(` - ${f.file}: '--fix${f.level === 'all' ? '=all' : ''}' produced output that is still INVALID per mermaid-cli — ${f.message.split('\n')[0]}`);
    }
    process.exit(1);
  }
}

main();
