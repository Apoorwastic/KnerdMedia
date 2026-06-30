import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import taskRoutes from './routes/tasks';
import eventRoutes from './routes/events';
import timeEntryRoutes from './routes/timeEntries';
import userRoutes from './routes/users';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/time-entries', timeEntryRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

export default app;
