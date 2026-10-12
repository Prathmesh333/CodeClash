import { defineConfig, createServer } from 'vite';
import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { publicSeo, seoHead, prerenderFile } from '../../packages/seo.ts';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
const runtime = dirname(createRequire(import.meta.url).resolve('pyodide'));
const destination = fileURLToPath(new URL('./public/python-runtime/314.0.7/', import.meta.url));
mkdirSync(destination, { recursive: true });
for (const file of [
  'pyodide.js',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
])
  copyFileSync(join(runtime, file), join(destination, file));
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [
    react(),
    {
      name: 'prerender-public-pages',
      apply: 'build',
      async closeBundle() {
        const output = fileURLToPath(new URL('../../dist/web/', import.meta.url));
        const base = readFileSync(join(output, 'index.html'), 'utf8')
          .replace(/<title>[^<]*<\/title>/, '')
          .replace(/<meta name="description"[^>]*\/>/, '');
        const server = await createServer({
          configFile: false,
          root: fileURLToPath(new URL('.', import.meta.url)),
          plugins: [react()],
          server: { middlewareMode: true },
        });
        try {
          const { renderPublic } = await server.ssrLoadModule('/src/prerender.tsx');
          mkdirSync(join(output, 'prerender'), { recursive: true });
          for (const path of Object.keys(publicSeo)) {
            const html = base
              .replace(
                '</head>',
                `<!--seo:start-->${seoHead(path, 'https://code-clash.com')}<!--seo:end--></head>`,
              )
              .replace(
                '<div id="root"></div>',
                `<div id="root"><!--prerender:start-->${renderPublic(path)}<!--prerender:end--></div>`,
              );
            const directory = join(output, prerenderFile(path));
            mkdirSync(directory, { recursive: true });
            writeFileSync(join(directory, 'index.html'), html);
            if (path === '/') writeFileSync(join(output, 'index.html'), html);
          }
        } finally {
          await server.close();
        }
      },
    },
    {
      name: 'python-runtime-cors',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/python-runtime/')) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          }
          next();
        });
      },
    },
  ],
  optimizeDeps: {
    include: [
      'react',
      'react-dom/client',
      '@monaco-editor/react',
      'monaco-editor/editor/editor.api',
      'monaco-editor/languages/definitions/python/register',
    ],
  },
  server: {
    host: '0.0.0.0',
    port: Number(process.env.WEB_PORT ?? 5173),
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.API_TARGET ?? 'http://127.0.0.1:8787',
        ws: true,
        changeOrigin: true,
        configure(proxy) {
          // Preserve cross-origin rejection while forwarding same-origin LAN requests to loopback.
          const forwardOrigin = (
            outgoing: import('node:http').ClientRequest,
            incoming: import('node:http').IncomingMessage,
          ) => {
            const origin = incoming.headers.origin;
            if (!origin) return;
            try {
              if (
                new URL(origin).host === incoming.headers.host &&
                new URL(origin).protocol === 'http:'
              )
                outgoing.setHeader('Origin', 'http://127.0.0.1:5173');
            } catch {
              /* Leave malformed origins for the API to reject. */
            }
          };
          proxy.on('proxyReq', forwardOrigin);
          proxy.on('proxyReqWs', forwardOrigin);
        },
      },
    },
  },
  build: { outDir: '../../dist/web', emptyOutDir: true },
});
