#!/usr/bin/env node

import { build, analyzeMetafile } from 'esbuild';
import fs from 'fs';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const brotli = promisify(zlib.brotliCompress);

// ANSI colors
const reset = '\x1b[0m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const blue = '\x1b[36m';

async function buildProduction() {
  console.log(blue + '🔨 Building production bundles...' + reset);

  // Build configurations
  const builds = [
    {
      name: 'Standard',
      entryPoint: 'out/browser.js',
      outfile: 'site/maid/maid.bundle.js',
      expectedSize: 300 // KB
    },
    {
      name: 'Minimal',
      entryPoint: 'out/browser-minimal.js',
      outfile: 'site/maid/maid-minimal.bundle.js',
      expectedSize: 280 // KB
    },
    {
      name: 'Lazy',
      entryPoint: 'out/browser-lazy.js',
      outdir: 'site/maid/lazy',
      expectedSize: 100, // KB - much smaller initial load
      splitting: true,
      format: 'esm'
    }
  ];

  const results = [];

  for (const config of builds) {
    console.log(`\n📦 Building ${config.name} bundle...`);

    // Build with esbuild
    const result = await build({
      entryPoints: [config.entryPoint],
      bundle: true,
      minify: true,
      treeShaking: true,
      format: config.format || 'esm',
      target: 'es2020',
      platform: 'browser',
      outfile: config.outfile,
      outdir: config.outdir,
      splitting: config.splitting,
      metafile: true,
      external: [
        'fs',
        'path',
        'url',
        'util',
        '@modelcontextprotocol/sdk',
        '@modelcontextprotocol/sdk/*'
      ],
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      pure: ['console.log', 'console.debug'], // Remove debug logs
      drop: ['debugger', 'console'], // Remove all console statements in production
      legalComments: 'none', // Remove all comments
    });

    // Read the output file
    const outputPath = config.outfile || `${config.outdir}/${config.name.toLowerCase()}.js`;
    const outputContent = config.outdir
      ? fs.readFileSync(`${config.outdir}/${config.entryPoint.split('/').pop()}`, 'utf8')
      : fs.readFileSync(config.outfile, 'utf8');
    const sizeKB = (outputContent.length / 1024).toFixed(1);

    // Create compressed versions
    const gzipped = await gzip(outputContent, { level: 9 });
    const gzipSizeKB = (gzipped.length / 1024).toFixed(1);

    const brotlied = await brotli(outputContent, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11, // Max compression
      }
    });
    const brotliSizeKB = (brotlied.length / 1024).toFixed(1);

    // Save compressed versions
    if (config.outfile) {
      fs.writeFileSync(config.outfile + '.gz', gzipped);
      fs.writeFileSync(config.outfile + '.br', brotlied);
    }

    // Size check
    const sizeCheck = parseFloat(sizeKB) <= config.expectedSize ? '✅' : '⚠️';

    results.push({
      name: config.name,
      file: config.outfile,
      size: sizeKB,
      gzip: gzipSizeKB,
      brotli: brotliSizeKB,
      check: sizeCheck
    });

    console.log(`  Size: ${sizeKB}KB ${sizeCheck}`);
    console.log(`  Gzip: ${gzipSizeKB}KB`);
    console.log(`  Brotli: ${brotliSizeKB}KB`);

    // Analyze bundle composition (top 5 modules)
    if (result.metafile) {
      const analysis = await analyzeMetafile(result.metafile);
      const lines = analysis.split('\n').slice(0, 6);
      console.log(yellow + '  Top modules:' + reset);
      lines.forEach(line => {
        if (line.includes('│')) {
          console.log('    ' + line);
        }
      });
    }
  }

  // Summary table
  console.log('\n' + green + '📊 Build Summary' + reset);
  console.log('┌─────────────┬──────────┬──────────┬──────────┬────────┐');
  console.log('│ Bundle      │ Size     │ Gzip     │ Brotli   │ Status │');
  console.log('├─────────────┼──────────┼──────────┼──────────┼────────┤');

  results.forEach(r => {
    console.log(
      `│ ${r.name.padEnd(11)} │ ${(r.size + 'KB').padEnd(8)} │ ${
        (r.gzip + 'KB').padEnd(8)
      } │ ${(r.brotli + 'KB').padEnd(8)} │ ${r.check.padEnd(6)} │`
    );
  });

  console.log('└─────────────┴──────────┴──────────┴──────────┴────────┘');

  // Size comparison with Mermaid.js
  const ourSize = parseFloat(results[0].gzip);
  const mermaidSize = 800; // KB gzipped
  const savings = ((1 - ourSize / mermaidSize) * 100).toFixed(0);

  console.log('\n' + green + '🎯 vs Mermaid.js:' + reset);
  console.log(`  Mermaid.js: 2,600KB (800KB gzipped)`);
  console.log(`  Maid:       ${results[0].size}KB (${results[0].gzip}KB gzipped)`);
  console.log(`  Savings:    ${savings}% smaller!`);

  // Create size-badge.json for README badges
  const badge = {
    schemaVersion: 1,
    label: 'bundle size',
    message: `${results[0].gzip}KB gzipped`,
    color: ourSize < 100 ? 'green' : ourSize < 200 ? 'yellow' : 'red'
  };
  fs.writeFileSync('size-badge.json', JSON.stringify(badge, null, 2));

  console.log('\n' + green + '✨ Production build complete!' + reset);
}

// Run the build
buildProduction().catch(console.error);