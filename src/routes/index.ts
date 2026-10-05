import axios from 'axios';
import { Request, Response } from 'express';
import { config } from '../config/env';
import { clearWabaConfig, getActiveWabaConfig, setActiveWabaConfig, WabaConfig } from '../config/waba';

function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, '').replace(/[^\d]/g, '');
}

export function isConfigComplete(config?: WabaConfig | null) {
  return Boolean(config?.accessToken && config?.phoneNumberId);
}

export function validateWabaSetup(payload: Partial<WabaConfig>) {
  if (!payload.accessToken || typeof payload.accessToken !== 'string') {
    throw new Error('accessToken is required');
  }

  if (!payload.phoneNumberId || typeof payload.phoneNumberId !== 'string') {
    throw new Error('phoneNumberId is required');
  }

  if (!payload.webhookVerifyToken && config.webhookVerifyToken) {
    payload.webhookVerifyToken = config.webhookVerifyToken;
  }

  return {
    accessToken: payload.accessToken,
    phoneNumberId: payload.phoneNumberId,
    businessAccountId: payload.businessAccountId || '',
    webhookVerifyToken: payload.webhookVerifyToken || config.webhookVerifyToken,
    webhookUrl: payload.webhookUrl || '',
  } satisfies WabaConfig;
}

export function setupWaba(req: Request, res: Response) {
  try {
    const payload = req.body || {};
    const validated = validateWabaSetup(payload);
    setActiveWabaConfig(validated);

    return res.json({
      ok: true,
      message: 'WABA configuration saved successfully',
      config: {
        phoneNumberId: validated.phoneNumberId,
        businessAccountId: validated.businessAccountId,
        webhookVerifyToken: validated.webhookVerifyToken,
        webhookUrl: validated.webhookUrl,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to configure WABA';
    return res.status(400).json({ error: message });
  }
}

export function getWabaStatus(req: Request, res: Response) {
  const active = getActiveWabaConfig();
  const status = isConfigComplete(active) ? 'configured' : 'not-configured';

  return res.json({
    ok: true,
    status,
    phoneNumberId: active?.phoneNumberId || null,
    businessAccountId: active?.businessAccountId || null,
  });
}

export function clearWaba(req: Request, res: Response) {
  clearWabaConfig();
  return res.json({ ok: true, message: 'WABA configuration cleared' });
}

export function handleWebhookVerification(req: Request, res: Response) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const active = getActiveWabaConfig();
  const expectedToken = active?.webhookVerifyToken || config.webhookVerifyToken;

  if (mode === 'subscribe' && token === expectedToken) {
    return res.status(200).send(String(challenge || ''));
  }

  return res.status(403).json({ error: 'Verification failed' });
}

export function handleWebhookEvent(req: Request, res: Response) {
  const body = req.body || {};

  if (!body.entry || !Array.isArray(body.entry)) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  const entries = body.entry;
  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      const value = change.value || {};
      const messages = value.messages || [];
      for (const message of messages) {
        const from = message.from;
        const text = message.text?.body || '';
        const type = message.type || 'unknown';

        console.log('[Webhook] Incoming message:', JSON.stringify({ from, type, text }, null, 2));
      }
    }
  }

  return res.status(200).json({ ok: true, received: true });
}

export function validatePhoneInput(phoneNumber: string) {
  const normalized = normalizePhone(phoneNumber);
  if (!normalized || normalized.length < 8) {
    throw new Error('Phone number is invalid');
  }

  return `${normalized}@s.whatsapp.net`;
}

export async function generateSignedRequest(payload: Record<string, unknown>) {
  const active = getActiveWabaConfig();
  if (!active?.accessToken) {
    throw new Error('WABA accessToken is missing');
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v20.0/${active.phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${active.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    const message = axios.isAxiosError(error) ? error.response?.data || error.message : 'Unknown error';
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
}
