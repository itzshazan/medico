import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Routers
import authRouter from './routes/auth.js';
import censusRouter from './routes/census.js';
import patientsRouter from './routes/patients.js';
import ingestRouter from './routes/ingest.js';
import narrativeRouter from './routes/narrative.js';
import safetyRouter from './routes/safety.js';
import auditRouter from './routes/audit.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // Allow connections from Vite dev server
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-name', 'x-user-role', 'x-api-key']
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup file paths for static uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/census', censusRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/ingest', ingestRouter);
app.use('/api/narrative', narrativeRouter);
app.use('/api/safety', safetyRouter);
app.use('/api/audit', auditRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'Medico Agent Clinical AI API' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Medico Agent Backend running on port ${PORT}`);
});
