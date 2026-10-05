import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from '../config/env';
import { clearWaba, getWabaStatus, handleWebhookEvent, handleWebhookVerification, setupWaba } from '../lib/meta';
import { generateSignedRequest, sendButtonMessage, sendCarouselMessage, sendMediaMessage, sendTemplateMessage, sendText } from '../lib/meta';

const app = express();

app.use(cors({ origin: config.allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'CodeFlow WhatsApp Connector', mode: config.nodeEnv });
});

app.get('/webhook', handleWebhookVerification);
app.post('/webhook', handleWebhookEvent);

app.post('/api/setup', setupWaba);
app.get('/api/setup', getWabaStatus);
app.delete('/api/setup', clearWaba);

app.post('/api/send', async (req: Request, res: Response) => {
  try {
    const { to, text } = req.body || {};
    if (!to || !text) {
      return res.status(400).json({ error: 'to and text are required' });
    }

    const result = await sendText(to, text);
    return res.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send message';
    return res.status(500).json({ error: message });
  }
});

app.post('/api/send-template', async (req: Request, res: Response) => {
  try {
    const { to, templateName, languageCode = 'en_US', components = [] } = req.body || {};
    if (!to || !templateName) {
      return res.status(400).json({ error: 'to and templateName are required' });
    }

    const result = await sendTemplateMessage(to, templateName, languageCode, components);
    return res.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send template';
    return res.status(500).json({ error: message });
  }
});

app.post('/api/send-button', async (req: Request, res: Response) => {
  try {
    const { to, bodyText, buttons } = req.body || {};
    if (!to || !bodyText || !Array.isArray(buttons) || buttons.length === 0) {
      return res.status(400).json({ error: 'to, bodyText, and buttons are required' });
    }

    const result = await sendButtonMessage(
      to,
      bodyText,
      buttons.map((button: { id: string; title: string }) => ({
        id: String(button.id),
        title: String(button.title),
      }))
    );

    return res.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send button message';
    return res.status(500).json({ error: message });
  }
});

app.post('/api/send-carousel', async (req: Request, res: Response) => {
  try {
    const { to, bodyText, cards } = req.body || {};
    if (!to || !bodyText || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: 'to, bodyText, and cards are required' });
    }

    const result = await sendCarouselMessage(
      to,
      bodyText,
      cards.map((card: { id: string; title: string; subtitle: string; link?: string }) => ({
        id: String(card.id),
        title: String(card.title),
        subtitle: String(card.subtitle),
        link: card.link ? String(card.link) : undefined,
      }))
    );

    return res.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send carousel message';
    return res.status(500).json({ error: message });
  }
});

app.post('/api/send-media', async (req: Request, res: Response) => {
  try {
    const { to, mediaType, mediaUrl, caption, fileName } = req.body || {};
    if (!to || !mediaType || !mediaUrl) {
      return res.status(400).json({ error: 'to, mediaType, and mediaUrl are required' });
    }

    const supported = new Set(['image', 'document', 'video', 'audio']);
    if (!supported.has(String(mediaType))) {
      return res.status(400).json({ error: 'Unsupported mediaType. Use image, document, video, or audio.' });
    }

    const result = await sendMediaMessage(
      to,
      String(mediaType) as 'image' | 'document' | 'video' | 'audio',
      String(mediaUrl),
      caption ? String(caption) : undefined,
      fileName ? String(fileName) : undefined
    );

    return res.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send media';
    return res.status(500).json({ error: message });
  }
});

app.get('/api/config', (_req: Request, res: Response) => {
  const active = getWabaStatus;
  return res.json({ ok: true, status: typeof active === 'function' ? 'configured' : 'not-configured' });
});

app.post('/api/test', async (req: Request, res: Response) => {
  try {
    const { to = '15551234567', text = 'CodeFlow setup test message' } = req.body || {};
    const result = await generateSignedRequest({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: text,
      },
    });

    return res.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Test request failed';
    return res.status(500).json({ error: message });
  }
});

export default app;
