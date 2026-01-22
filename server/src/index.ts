import express, { type Application, type Request, type Response } from 'express';

const app: Application = express();
const port: number = 3000;

app.get('/', (_req: Request, res: Response) => {
  res.send('TypeScript With Express!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}/`);
});