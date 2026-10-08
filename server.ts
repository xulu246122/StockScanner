import 'dotenv/config';
import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { apiRouter } from './server/routes/api.ts';
import { alertEngine } from './server/services/alertEngine.ts';
import { universeSyncWorker } from './server/workers/universeSyncWorker.ts';
import { universeDb } from './server/db/universeDb.ts';
import { websocketServer } from './server/services/websocketServer.ts';

async function startServer() {
  // Ensure Master Database & Presets are initialized
  await universeDb.init();

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const HOST = process.env.HOST || '0.0.0.0';
  const isProd = process.env.NODE_ENV === 'production';

  // Enable CORS for Mobile & Remote devices across LAN
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // Mount API router
  app.use('/api', apiRouter);
  app.use('/strategy-alert', (req, _res, next) => {
    req.url = '/strategy-alert' + req.url;
    next();
  }, apiRouter);

  // Background Universe Sync Worker
  universeSyncWorker.start().catch((err) => {
    console.error('Universe sync worker initialization error:', err);
  });

  // Background Alert Scanner (runs every 2 minutes)
  setInterval(async () => {
    try {
      await alertEngine.scanAlerts();
    } catch (err) {
      console.error('Background alert scan failed:', err);
    }
  }, 2 * 60 * 1000);

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: { ignored: ['**/.vs/**'] }
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const appDistPath = path.resolve(process.cwd(), 'dist');
    const distPath = fs.existsSync(path.join(appDistPath, 'index.html'))
      ? appDistPath
      : fs.existsSync(path.join(__dirname, 'index.html'))
        ? __dirname
        : path.resolve(__dirname, 'dist');
    console.log(`Serving frontend assets from ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const httpServer = http.createServer(app);

  // Mount local micro-ws real-time streaming endpoint
  websocketServer.init(httpServer, '/ws');
  websocketServer.startTickStream(2000);

  httpServer.listen(PORT, HOST, () => {
    console.log(`🚀 US Stock AI Scanner & Alert Server running at http://localhost:${PORT}`);
    console.log(`📡 Local Micro-WS real-time stream running at ws://localhost:${PORT}/ws`);
  });

  // Graceful shutdown hooks
  const flushDatabaseOnExit = () => {
    try {
      websocketServer.stop();
      universeDb.saveSync();
      console.log('[UniverseDB] Synchronous database exit flush completed.');
    } catch (e) {
      console.error('[UniverseDB] Exit flush failed:', e);
    }
  };
  process.on('SIGTERM', () => { flushDatabaseOnExit(); process.exit(0); });
  process.on('SIGINT', () => { flushDatabaseOnExit(); process.exit(0); });
  process.on('exit', () => { flushDatabaseOnExit(); });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
