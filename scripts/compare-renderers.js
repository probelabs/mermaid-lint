#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderMermaid } from '../out/renderer/index.js';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureMermaidCli() {
  try {
    execSync('which mmdc', { stdio: 'pipe' });
    return true;
  } catch {
    console.log('⚠️  mermaid-cli not found. Installing...');
    console.log('   npm install -g @mermaid-js/mermaid-cli');
    try {
      execSync('npm install -g @mermaid-js/mermaid-cli', { stdio: 'inherit' });
      return true;
    } catch {
      console.error('Failed to install mermaid-cli');
      return false;
    }
  }
}

function renderWithMermaidCli(inputFile, outputFile) {
  try {
    // Use mermaid-cli to render
    execSync(`mmdc -i "${inputFile}" -o "${outputFile}" -t default -b white`, {
      stdio: 'pipe',
      env: { ...process.env, PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'false' }
    });
    return true;
  } catch (error) {
    console.error(`Failed to render with mermaid-cli: ${error.message}`);
    return false;
  }
}

function renderWithMaid(inputFile, outputFile) {
  try {
    // Read the mermaid file
    const content = fs.readFileSync(inputFile, 'utf-8');

    // Render to SVG
    const result = renderMermaid(content);

    if (!result || !result.svg) {
      console.error(`Failed to render with Maid renderer`);
      return false;
    }

    // Save SVG first
    const svgFile = outputFile.replace('.png', '.svg');
    fs.writeFileSync(svgFile, result.svg);

    // Convert SVG to PNG
    try {
      // Try using rsvg-convert
      execSync(`rsvg-convert -o "${outputFile}" "${svgFile}" 2>/dev/null`, { stdio: 'pipe' });
    } catch {
      try {
        // Fallback to ImageMagick
        execSync(`convert "${svgFile}" "${outputFile}" 2>/dev/null`, { stdio: 'pipe' });
      } catch {
        console.log(`⚠️  PNG conversion failed. SVG saved as: ${svgFile}`);
        return false;
      }
    }

    // Clean up SVG
    fs.unlinkSync(svgFile);
    return true;
  } catch (error) {
    console.error(`Failed to render with Maid: ${error.message}`);
    return false;
  }
}

function compareRenderers(inputFile) {
  console.log(`\n📊 Comparing renderers for: ${inputFile}\n`);

  // Create temp directory
  const tempDir = path.resolve(__dirname, '..', 'temp', 'comparison');
  fs.mkdirSync(tempDir, { recursive: true });

  const basename = path.basename(inputFile, '.mmd');
  const mermaidOutput = path.join(tempDir, `${basename}-mermaid.png`);
  const maidOutput = path.join(tempDir, `${basename}-maid.png`);

  // Render with both renderers
  console.log('1. Rendering with Mermaid CLI...');
  const mermaidSuccess = renderWithMermaidCli(inputFile, mermaidOutput);

  console.log('2. Rendering with Maid (our renderer)...');
  const maidSuccess = renderWithMaid(inputFile, maidOutput);

  // Report results
  console.log('\n📁 Output files:');
  if (mermaidSuccess) {
    console.log(`   ✅ Mermaid: ${mermaidOutput}`);
  } else {
    console.log(`   ❌ Mermaid: Failed to render`);
  }

  if (maidSuccess) {
    console.log(`   ✅ Maid:    ${maidOutput}`);
  } else {
    console.log(`   ❌ Maid:    Failed to render`);
  }

  if (mermaidSuccess && maidSuccess) {
    console.log('\n🔍 Visual comparison:');
    console.log(`   You can now open both images to compare:`);
    console.log(`   open "${mermaidOutput}" "${maidOutput}"`);

    // Try to open both images
    try {
      execSync(`open "${mermaidOutput}" "${maidOutput}"`, { stdio: 'pipe' });
      console.log('   (Images opened in default viewer)');
    } catch {
      // Silently fail if open command doesn't work
    }
  }

  return { mermaidOutput, maidOutput, mermaidSuccess, maidSuccess };
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`Usage: node scripts/compare-renderers.js <input.mmd>
       node scripts/compare-renderers.js --example

This script renders a Mermaid diagram using both:
- Official mermaid-cli (via Puppeteer)
- Our Maid renderer (lightweight, experimental)

Examples:
  # Compare specific diagram
  node scripts/compare-renderers.js test-fixtures/flowchart/valid/complex-shapes.mmd

  # Run example comparison
  node scripts/compare-renderers.js --example

Output files are saved to temp/comparison/ for visual inspection.`);
    process.exit(1);
  }

  // Ensure mermaid-cli is installed
  if (!ensureMermaidCli()) {
    console.error('Cannot proceed without mermaid-cli');
    process.exit(1);
  }

  if (args[0] === '--example') {
    // Use complex-shapes as example
    const exampleFile = path.resolve(__dirname, '..', 'test-fixtures', 'flowchart', 'valid', 'complex-shapes.mmd');
    compareRenderers(exampleFile);
  } else {
    const inputFile = args[0];

    if (!fs.existsSync(inputFile)) {
      console.error(`File not found: ${inputFile}`);
      process.exit(1);
    }

    compareRenderers(inputFile);
  }
}

main();