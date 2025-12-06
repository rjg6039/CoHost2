import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import waitlistRoutes from './routes/waitlist.js';
import analyticsRoutes from './routes/analytics.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn("[Startup] MONGODB_URI is not set.");
}
if (!process.env.JWT_SECRET) {
  console.warn("[Startup] JWT_SECRET is not set.");
}

// Base middleware
app.use(cors());
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/analytics", analyticsRoutes);

// Serve frontend from ../frontend with proper MIME types
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "..", "frontend");

// Custom static file serving with correct MIME types
app.use(express.static(frontendPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Mongo + start
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("[Mongo] Connected");
    app.listen(PORT, () => {
      console.log(`[Server] Listening on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("[Mongo] Connection error:", err);
    process.exit(1);
  });