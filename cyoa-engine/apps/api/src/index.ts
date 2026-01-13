import express from 'express';
import storiesRouter from './routes/stories.js';
import healthRouter from './routes/health.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));

// CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(JSON.stringify({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: Date.now() - start,
      timestamp: new Date().toISOString()
    }));
  });
  next();
});

// API key authentication (optional, enabled via env var)
const API_KEY = process.env.CYOA_API_KEY;
if (API_KEY) {
  app.use('/v1', (req, res, next) => {
    const providedKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (providedKey !== API_KEY) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  });
}

// Routes
app.use('/health', healthRouter);
app.use('/v1/stories', storiesRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`CYOA API listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API docs:`);
  console.log(`  POST /v1/stories - Create story generation job`);
  console.log(`  GET  /v1/stories/:id - Get story job status or completed story`);
  console.log(`  GET  /v1/stories/:id/scenes/:sceneId - Get specific scene`);
  console.log(`  POST /v1/stories/:id/play - Start playthrough`);
  console.log(`  POST /v1/stories/:id/play/:pid/decide - Make decision`);
  console.log(`  GET  /v1/stories/:id/play/:pid - Get playthrough status`);
});
