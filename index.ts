import express from 'express';
import type { Express, Request, Response } from 'express';
import * as dotenv from 'dotenv';
import connectDB from './db/db.js';
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
connectDB();
app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server is running');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
