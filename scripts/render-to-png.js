#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderMermaid } from '../out/renderer/index.js';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function renderToPng(inputFile, outputFile) {
  // Read the mermaid file
  const content = fs.readFileSync(inputFile, 'utf-8');

  // Render to SVG
  const result = renderMermaid(content);

  if (!result || !result.svg) {
    console.error(`Failed to render ${inputFile}`);
    return false;
  }

  // Save SVG temporarily
  const tempSvg = outputFile.replace('.png', '.svg');
  fs.writeFileSync(tempSvg, result.svg);

  // Convert SVG to PNG using system tools
  try {
    // Try using rsvg-convert (brew install librsvg on macOS)
    execSync(`rsvg-convert -o "${outputFile}" "${tempSvg}" 2>/dev/null`, { stdio: 'pipe' });
    console.log(`✅ Generated PNG: ${outputFile}`);
  } catch {
    try {
      // Fallback to ImageMagick (brew install imagemagick on macOS)
      execSync(`convert "${tempSvg}" "${outputFile}" 2>/dev/null`, { stdio: 'pipe' });
      console.log(`✅ Generated PNG: ${outputFile}`);
    } catch {
      console.log(`⚠️  PNG conversion requires rsvg-convert or ImageMagick`);
      console.log(`   On macOS: brew install librsvg`);
      console.log(`   Or: brew install imagemagick`);
      console.log(`   SVG saved as: ${tempSvg}`);
      return false;
    }
  }

  // Clean up temp SVG
  fs.unlinkSync(tempSvg);
  return true;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`Usage: node scripts/render-to-png.js <input.mmd> [output.png]
       node scripts/render-to-png.js --all

Examples:
  # Render single file
  node scripts/render-to-png.js diagram.mmd
  node scripts/render-to-png.js diagram.mmd custom-output.png

  # Render all test fixtures
  node scripts/render-to-png.js --all

Note: PNG files are saved to a temp directory and not committed to the repo.`);
    process.exit(1);
  }

  if (args[0] === '--all') {
    // Render all flowchart fixtures
    const fixturesDir = path.resolve(__dirname, '..', 'test-fixtures', 'flowchart', 'valid');
    const outputDir = path.resolve(__dirname, '..', 'temp', 'png');

    // Create output directory
    fs.mkdirSync(outputDir, { recursive: true });

    const files = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.mmd'));

    console.log(`Rendering ${files.length} diagrams to PNG...`);

    for (const file of files) {
      const inputPath = path.join(fixturesDir, file);
      const outputPath = path.join(outputDir, file.replace('.mmd', '.png'));
      renderToPng(inputPath, outputPath);
    }

    console.log(`\nPNG files saved to: ${outputDir}`);
    console.log('Note: These files are in .gitignore and not tracked in the repo');
  } else {
    // Render single file
    const inputFile = args[0];
    const outputFile = args[1] || inputFile.replace('.mmd', '.png');

    if (!fs.existsSync(inputFile)) {
      console.error(`File not found: ${inputFile}`);
      process.exit(1);
    }

    renderToPng(inputFile, outputFile);
  }
}

main();