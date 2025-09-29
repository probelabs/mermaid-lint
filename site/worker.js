// Cloudflare Worker for routing probelabs.com/maid/* to Maid Pages site
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Check if this is a request to probelabs.com/maid or /maid/*
    if (url.hostname === 'probelabs.com' && url.pathname.startsWith('/maid')) {
      // Handle /maid without trailing slash by redirecting to /maid/
      if (url.pathname === '/maid') {
        return Response.redirect(url.origin + '/maid/', 301);
      }
      
      // Remove /maid from the path and proxy to the Pages site
      const newPath = url.pathname.replace('/maid', '') || '/';
      const pagesUrl = `https://probelabs-site.pages.dev${newPath}${url.search}`;
      
      // Fetch from the Pages deployment
      const response = await fetch(pagesUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });
      
      // Create new response with same content but updated headers
      const newResponse = new Response(response.body, response);
      
      // Update any absolute links in HTML content to include /maid prefix
      if (response.headers.get('content-type')?.includes('text/html')) {
        const html = await response.text();
        const updatedHtml = html
          .replace(/href="\//g, 'href="/maid/')
          .replace(/src="\//g, 'src="/maid/')
          .replace(/url\(\//g, 'url(/maid/');
        return new Response(updatedHtml, {
          status: response.status,
          headers: response.headers
        });
      }
      
      return newResponse;
    }
    
    // For any other requests, pass through
    return fetch(request);
  },
};