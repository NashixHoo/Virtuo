// =============================================================
// VIRTUO APP SERVER (PORT 3000)
// server.ts
// =============================================================

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { aiRouter } from './backend/routes/ai-routes';
import { systemRouter } from './backend/routes/system-routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Mount modular Backend API Routes
app.use('/api/ai', aiRouter);
app.use('/api', systemRouter);

// Mount Vite middleware in development, or serve dist in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Virtuo React server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
