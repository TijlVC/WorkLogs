import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import { Request, Response } from 'express';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Je bestaande routes met types
app.post('/auth/login', async (req: Request, res: Response) => {
  // ... login logic
});

// Export de express app als Firebase function
export const api = functions.https.onRequest(app); 