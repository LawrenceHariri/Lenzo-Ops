/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI (picks up GEMINI_API_KEY from environment)
const ai = new GoogleGenAI();

// Endpoint for Off-Ramp Coach
app.post('/api/coach/offramp', async (req, res) => {
  try {
    const { systemInstruction, messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ ok: false, error: 'Messages array is required' });
    }

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: systemInstruction ? String(systemInstruction) : undefined,
      },
    });

    const replyText = response.text || '';
    return res.json({ ok: true, text: replyText });
  } catch (err: any) {
    console.error('Gemini offramp error:', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Gemini service error' });
  }
});

// Endpoint for On-Ramp Coach
app.post('/api/coach/onramp', async (req, res) => {
  try {
    const { systemInstruction, prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ ok: false, error: 'Prompt is required' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: String(prompt),
      config: {
        systemInstruction: systemInstruction ? String(systemInstruction) : undefined,
      },
    });

    const replyText = response.text || '';
    return res.json({ ok: true, text: replyText });
  } catch (err: any) {
    console.error('Gemini onramp error:', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Gemini service error' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
