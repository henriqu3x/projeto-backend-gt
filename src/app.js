import express from 'express';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import routes from './routes/index.js';

const app = express();

app.use(express.json({ limit: '20mb' }));
app.use('/media', express.static(path.join(process.cwd(), 'media')));

const openApiPath = path.join(process.cwd(), 'src', 'docs', 'openapi.json');
const openApiDocument = JSON.parse(fs.readFileSync(openApiPath, 'utf-8'));

app.get('/docs.json', (req, res) => res.json(openApiDocument));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.get('/', (req, res) => {
  return res.status(200).json({
    message: 'API online. Acesse /docs para a documentação Swagger.'
  });
});

app.use(routes);

app.use((req, res) => res.status(404).json({ message: 'Not found' }));

export default app;
