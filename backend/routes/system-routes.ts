// =============================================================
// VIRTUO BACKEND - SYSTEM & HEALTH ROUTES (/api)
// backend/routes/system-routes.ts
// =============================================================

import { Router, Request, Response } from 'express';

export const systemRouter = Router();

systemRouter.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    service: 'virtuo-api',
    uptime: process.uptime(),
    time: new Date().toISOString() 
  });
});

systemRouter.get('/version', (req: Request, res: Response) => {
  res.json({
    version: '2.0.0',
    platform: 'Virtuo Cloud',
    engine: 'React 19 + TypeScript + Express + Vite',
    environment: process.env.NODE_ENV || 'development'
  });
});
