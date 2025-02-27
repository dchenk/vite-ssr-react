import http from 'http';
import type { AddressInfo } from 'net';
import path from 'path';
import execa from 'execa';
import express from 'express';

/**
 * Given an app path, build it and serve it in production mode with Express.
 */
async function serve(root: string): Promise<{ baseUrl: string; server: http.Server } | undefined> {
  const srcDir = path.resolve(root);

  // build
  await execa('npm', ['run', 'build'], { cwd: srcDir });

  // start prod server
  const app = await createServer(srcDir);

  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(0, () => {
        const { port } = server.address() as AddressInfo;
        const baseUrl = `http://localhost:${port}`;
        return resolve({ server, baseUrl });
      });
    } catch (e) {
      return reject(e);
    }
  });
}

export default serve;

// This is a simple Node server that uses the built project.

async function createServer(projectPath: string) {
  // This contains a list of static routes (assets)
  const { ssr } = await import(path.join(projectPath, 'dist/server/package.json'));

  // The manifest is required for preloading assets
  const manifest = await import(path.join(projectPath, 'dist/client/ssr-manifest.json'));

  // This is the server renderer we just built
  const { default: renderPage } = await import(path.join(projectPath, 'dist/server'));

  const server = express();

  // Serve every static asset route
  for (const asset of ssr.assets || []) {
    server.use(`/${asset}`, express.static(path.join(`${projectPath}/dist/client/${asset}`)));
  }

  // Everything else is treated as a "rendering request"
  server.get('*', async (request, response) => {
    const url = `${request.protocol}://${request.get('host')}${request.originalUrl}`;

    const { html, status, statusText, headers } = await renderPage(url, {
      manifest,
      preload: true,
      // Anything passed here will be available in the main hook
      request,
      response,
      // initialState: { ... } // <- This would also be available
    });

    response.writeHead(status || 200, statusText || headers, headers);
    response.end(html);
  });

  return server;
}
