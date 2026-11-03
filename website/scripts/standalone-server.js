/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const BIND_HOST = process.env.BIND_HOST || '0.0.0.0';
const UPSTREAM_API = (process.env.API_URL || 'https://api.sysa.in').replace(/\/+$/, '');

const PUBLIC_DIR = process.env.PUBLIC_DIR || __dirname;

// Trust proxy for Hostinger/LiteSpeed
app.set('trust proxy', 1);

// Disable x-powered-by
app.disable('x-powered-by');

// CORS middleware for local development preview
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (
    origin &&
    (/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin) ||
      origin === 'http://localhost:5055')
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, X-Correlation-ID, X-SYSA-Proxy',
    );
  }
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// 1. Reverse proxy for /api/* to upstream API
app.use('/api', (req, res) => {
  const targetUrl = new URL(req.originalUrl, UPSTREAM_API);
  const isHttps = targetUrl.protocol === 'https:';
  const transport = isHttps ? https : http;

  const headers = { ...req.headers };
  headers.host = targetUrl.host;
  // Preserve real client IP
  headers['x-forwarded-for'] = req.ip || req.connection.remoteAddress;
  headers['x-forwarded-proto'] = req.protocol;

  const proxyReq = transport.request(
    targetUrl,
    {
      method: req.method,
      headers: headers,
      family: 4,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.setTimeout(10000, () => {
    proxyReq.destroy(new Error('Upstream timeout'));
  });

  proxyReq.on('error', (err) => {
    console.error('[PROXY-ERROR]', err.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: {
          code: 'UPSTREAM_UNAVAILABLE',
          message: 'API upstream service unreachable',
        },
      });
    }
  });

  req.pipe(proxyReq);
});

// 2. Serve static assets with caching
app.use(
  '/_next',
  express.static(path.join(PUBLIC_DIR, '_next'), {
    maxAge: '365d',
    immutable: true,
  }),
);

app.use(
  express.static(PUBLIC_DIR, {
    extensions: ['html'],
    maxAge: '1h',
  }),
);

// 3. Clean URL fallback for Next.js static export
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }

  const cleanPath = req.path.replace(/\/+$/, '') || '/index';
  const candidate1 = path.join(PUBLIC_DIR, `${cleanPath}.html`);
  const candidate2 = path.join(PUBLIC_DIR, cleanPath, 'index.html');

  if (fs.existsSync(candidate1) && fs.statSync(candidate1).isFile()) {
    return res.sendFile(candidate1);
  }
  if (fs.existsSync(candidate2) && fs.statSync(candidate2).isFile()) {
    return res.sendFile(candidate2);
  }

  const notFoundPath = path.join(PUBLIC_DIR, '404.html');
  if (fs.existsSync(notFoundPath)) {
    return res.status(404).sendFile(notFoundPath);
  }

  res.status(404).send('Not Found');
});

app.listen(PORT, BIND_HOST, () => {
  console.log(`SYSA website running on http://${BIND_HOST}:${PORT}`);
});
