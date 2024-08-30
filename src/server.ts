import 'dotenv/config';
import express from 'express';
import type { ErrorRequestHandler } from 'express';

const app = express();

const PORT = 3001;

app.use((req, _res, next) => {
  console.log({
    data: new Date(),
    method: req.method,
    router: req.originalUrl,
  });
  next();
});

app.use(express.json());

// app.use("/upload", CompaniesController);
app.get('/', (req, res) => res.send('BB'));

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error({ serverError: err.message });
  res.status(500).json({ err: 'internal error' });
};
app.use(errorHandler);

app.listen(PORT, () => console.log('running port', PORT));
