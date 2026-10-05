import axios from 'axios';
import { getActiveWabaConfig, WabaConfig } from '../config/waba';

const META_GRAPH_BASE = 'https://graph.facebook.com';

function getApiBaseUrl() {
  const config = getActiveWabaConfig();
  if (!config?.phoneNumberId) {
    throw new Error('WABA phoneNumberId is not configured');
  }

  return `${META_GRAPH_BASE}/v20.0/${config.phoneNumberId}`;
}

function getAccessToken() {
  const config = getActiveWabaConfig();
  if (!config?.accessToken) {
    throw new Error('WABA accessToken is not configured');
  }

  return config.accessToken;
}

export function buildMetaRequestConfig(config?: WabaConfig) {
  const resolved = config || getActiveWabaConfig();

  if (!resolved?.accessToken || !resolved.phoneNumberId) {
    throw new Error('WABA configuration is incomplete');
  }

  return {
    baseURL: `${META_GRAPH_BASE}/v20.0/${resolved.phoneNumberId}`,
    headers: {
      Authorization: `Bearer ${resolved.accessToken}`,
      'Content-Type': 'application/json',
    },
  };
}

export async function sendMetaMessage(payload: Record<string, unknown>) {
  const config = getActiveWabaConfig();
  if (!config) {
    throw new Error('WABA configuration is missing. Call /api/setup first');
  }

  const response = await axios.post(`${getApiBaseUrl()}/messages`, payload, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

export async function verifyAccessToken() {
  const config = getActiveWabaConfig();
  if (!config) {
    throw new Error('WABA configuration is missing');
  }

  const response = await axios.get(`${META_GRAPH_BASE}/debug_token`, {
    params: {
      input_token: config.accessToken,
      access_token: config.accessToken,
    },
  });

  return response.data;
}

export async function sendText(to: string, text: string) {
  return sendMetaMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      body: text,
      preview_url: false,
    },
  });
}

export async function sendButtonMessage(to: string, bodyText: string, buttons: Array<{ id: string; title: string }>) {
  return sendMetaMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: bodyText,
      },
      action: {
        buttons: buttons.map((button) => ({
          type: 'reply',
          reply: {
            id: button.id,
            title: button.title,
          },
        })),
      },
    },
  });
}

export async function sendCarouselMessage(to: string, bodyText: string, cards: Array<{ id: string; title: string; subtitle: string; link?: string }>) {
  return sendMetaMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'carousel',
      body: {
        text: bodyText,
      },
      action: {
        sections: cards.map((card) => ({
          title: card.title,
          rows: [
            {
              id: card.id,
              title: card.title,
              description: card.subtitle,
            },
          ],
        })),
      },
    },
  });
}

export async function sendMediaMessage(to: string, mediaType: 'image' | 'document' | 'video' | 'audio', mediaUrl: string, caption?: string, fileName?: string) {
  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to,
    type: mediaType,
  };

  const mediaObject: Record<string, unknown> = {
    link: mediaUrl,
  };

  if (caption) {
    mediaObject.caption = caption;
  }

  if (fileName && mediaType === 'document') {
    mediaObject.filename = fileName;
  }

  payload[mediaType] = mediaObject;

  return sendMetaMessage(payload);
}

export async function sendTemplateMessage(to: string, templateName: string, languageCode = 'en_US', components: Array<Record<string, unknown>> = []) {
  return sendMetaMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components,
    },
  });
}
