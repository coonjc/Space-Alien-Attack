import express from 'express';
import cors from 'cors';
import { env } from './lib/env';
import { authRouter } from './routes/auth';
import { statsRouter } from './routes/stats';
import { adminRouter } from './routes/admin';

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/stats', statsRouter);
app.use('/admin', adminRouter);

app.listen(env.port, () => {
  console.log(`Space Alien Attack server listening on port ${env.port}`);
});
