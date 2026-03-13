import express from 'express';
import path from 'path';
import routes from './routes/index.js';

const app = express();

app.use(express.json({ limit: '20mb' }));
app.use('/media', express.static(path.join(process.cwd(), 'media')));

app.use(routes);

app.use((req, res) => res.status(404).json({ message: 'Not found' }));

export default app;