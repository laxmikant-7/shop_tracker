import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { connectDB } from './config/db.js';

const app = express();

app.set('trust proxy', 1); // needed when hosted behind a proxy (Render, Railway)
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50kb' }));

app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

const port = process.env.PORT || 5000;

connectDB()
  .then(() => app.listen(port, () => console.log(`Server running on port ${port}`)))
  .catch((err) => {
    console.error('Startup failed:', err.message);
    process.exit(1);
  });