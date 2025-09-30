# Maid Development Guide

This document contains information for Claude Code and developers working on the Maid project.

## Deployment Workflow

### Deploying the Website to Cloudflare

The Maid website (`site/maid/`) is deployed to Cloudflare Pages and proxied through a Cloudflare Worker for the `probelabs.com/maid` subdirectory.

#### Architecture

1. **Cloudflare Pages**: Hosts the static site files (HTML, CSS, JS, images)
2. **Cloudflare Worker**: Proxies requests from `probelabs.com/maid/*` to the Pages deployment

#### Deployment Steps

##### 1. Build the Browser Bundle

Before deploying, ensure the browser bundle is built:

```bash
npm run build
npm run build:browser
```

This generates `site/maid/maid.bundle.js` which contains the browser-compatible Maid SDK.

##### 2. Deploy to Cloudflare Pages

Use Wrangler to deploy the site:

```bash
# Deploy to a preview branch
wrangler pages deploy site/maid --project-name=maid --branch=<branch-name>

# Deploy to production (main branch)
wrangler pages deploy site/maid --project-name=maid --branch=main
```

**Output:** You'll get two URLs:
- Unique deployment URL: `https://<hash>.maid-cp6.pages.dev`
- Branch alias URL: `https://<branch-name>.maid-cp6.pages.dev`

##### 3. Update Worker Configuration

If deploying a new branch or changing the Pages URL, update `site/worker.js`:

```javascript
// Update this line with the new Pages URL
const pagesUrl = `https://<branch-name>.maid-cp6.pages.dev${newPath}${url.search}`;
```

##### 4. Deploy the Worker

Deploy the updated worker:

```bash
cd site
wrangler deploy
```

The worker is configured with routes in `site/wrangler.toml`:
- `probelabs.com/maid`
- `probelabs.com/maid/*`

#### File Locations

- **Site files**: `site/maid/` (index.html, demo.html, images, etc.)
- **Worker**: `site/worker.js`
- **Worker config**: `site/wrangler.toml`
- **Browser bundle**: `site/maid/maid.bundle.js` (generated)

#### Access Points

- **Production**: https://probelabs.com/maid/
- **Pages Direct**: https://browser-demo.maid-cp6.pages.dev (or current branch alias)

#### Important Notes

- The worker automatically rewrites HTML paths to include the `/maid` prefix
- Always build the browser bundle before deploying
- Do NOT create GitHub Actions workflows for deployment - use Wrangler CLI directly
- The worker proxies all requests to Cloudflare Pages, including static assets

#### Troubleshooting

**Issue**: Changes not reflected on probelabs.com/maid/
- Check if the Pages deployment succeeded
- Verify the worker is pointing to the correct Pages URL
- Clear Cloudflare cache if needed

**Issue**: Assets not loading
- Check that the worker is correctly rewriting paths
- Verify all assets exist in `site/maid/` directory
- Check browser console for 404 errors

## Project Structure

```
site/
├── maid/                      # Website files
│   ├── index.html            # Main landing page
│   ├── demo.html             # Interactive demo
│   ├── maid.bundle.js        # Browser bundle (generated)
│   ├── maid_transparent.png  # Maid mascot image
│   └── README.md             # Demo documentation
├── worker.js                 # Cloudflare Worker for routing
└── wrangler.toml            # Worker configuration

src/                          # Source code for Maid SDK
out/                          # Build output (generated)
```

## Development

### Local Development Server

To test the website locally:

```bash
cd site/maid
python3 -m http.server 8080
```

Then open http://localhost:8080/demo.html

### Making Changes to the Demo

1. Edit `site/maid/demo.html` or other site files
2. Build the browser bundle if you changed SDK code: `npm run build:browser`
3. Test locally using the Python server
4. Deploy to Cloudflare Pages for preview
5. Update and deploy the worker if needed
6. Create PR with changes

## Browser Bundle

The browser bundle is created with esbuild and includes:
- Maid validation functions
- Auto-fix functionality
- All diagram type support

**Build command**: `npm run build:browser`

**Configuration** (in package.json):
```json
"build:browser": "npm run build && esbuild out/index.js --bundle --format=esm --outfile=site/maid/maid.bundle.js --platform=browser --external:fs --external:path --external:url --external:util"
```

## Cloudflare Pages Project

- **Project Name**: `maid`
- **Production Branch**: `main`
- **Build Command**: None (pre-built files deployed)
- **Build Output Directory**: `site/maid`
- **Custom Domain**: Proxied via worker to `probelabs.com/maid`
