import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './config/db.js';
import { seedSampleDataIfEmpty } from './utils/sampleData.js';

import authRoutes from './routes/authRoutes.js';
import linesRoutes from './routes/linesRoutes.js';
import inspectionsRoutes from './routes/inspectionsRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config(); // fallback

const app = express();
const PORT = process.env.PORT || 5000;

// Security and utility middleware
app.use(cors({
  origin: '*', // For dev flexibility, or set specific origin
  credentials: true
}));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static directory for uploaded inspection images
const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// System health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'VisionInspect AI Core Inspection API',
    version: '1.0.0',
    geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_google_gemini_api_key_here')
  });
});

// Mount modular API routers
app.use('/api/auth', authRoutes);
app.use('/api/lines', linesRoutes);
app.use('/api/inspections', inspectionsRoutes);
app.use('/api/analytics', analyticsRoutes);

// Serve production frontend assets if client is built
const clientDistDir = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

// 404 Handler for API routes
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

// Start Server
async function startServer() {
  try {
    await initializeDatabase();
    await seedSampleDataIfEmpty();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 VisionInspect AI Server running on http://localhost:${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔍 AI Vision Engine: Google Gemini API (@google/genai)`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start VisionInspect AI server:', err);
    process.exit(1);
  }
}

startServer();
