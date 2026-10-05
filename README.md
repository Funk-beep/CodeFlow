# CodeFlow WhatsApp Connector

CodeFlow is a production-ready WhatsApp connector designed to mirror the onboarding and messaging model of TextMeBot, but using the official Meta WhatsApp Business API (WABA) and a Google Cloud-friendly deployment model.

## Features

- Official Meta WABA integration
- Text, template, button, carousel, and media support
- Webhook verification and inbound message handling
- User setup flow for storing access token and phone number id
- Google Cloud Run / Docker compatible
- TypeScript backend with Express.js

## What you need

Before using this connector, create a WhatsApp Business Account in Meta and gather:

- Access Token
- Phone Number ID
- Business Account ID (optional but useful)
- Webhook Verify Token
- Webhook URL

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Update the values if needed:

```env
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
WEBHOOK_VERIFY_TOKEN=change-me
APP_SECRET=change-me
```

### 3. Run locally

```bash
npm run dev
```

### 4. Build production bundle

```bash
npm run build
npm start
```

## User onboarding flow (TextMeBot-like)

This app supports a simple flow where users enter their WABA setup details:

```bash
POST /api/setup
```

Example body:

```json
{
  "accessToken": "EAAB...",
  "phoneNumberId": "123456789012345",
  "businessAccountId": "123456789012345",
  "webhookVerifyToken": "myverifytoken",
  "webhookUrl": "https://your-domain.com/webhook"
}
```

This stores the active WABA config in memory for the live instance.

## Webhook setup

### Verify webhook endpoint

```bash
GET /webhook?hub.mode=subscribe&hub.verify_token=your-token&hub.challenge=123456
```

### Receive incoming messages

```bash
POST /webhook
```

This receives Meta's webhook payload and logs the message payload.

## Messaging endpoints

### Send text

```bash
POST /api/send
```

```json
{
  "to": "15551234567",
  "text": "Hello from CodeFlow"
}
```

### Send template

```bash
POST /api/send-template
```

```json
{
  "to": "15551234567",
  "templateName": "hello_world",
  "languageCode": "en_US"
}
```

### Send button message

```bash
POST /api/send-button
```

```json
{
  "to": "15551234567",
  "bodyText": "Choose an option",
  "buttons": [
    { "id": "option_1", "title": "Option 1" },
    { "id": "option_2", "title": "Option 2" }
  ]
}
```

### Send carousel

```bash
POST /api/send-carousel
```

```json
{
  "to": "15551234567",
  "bodyText": "Pick a product",
  "cards": [
    { "id": "p1", "title": "Product 1", "subtitle": "Great for business" },
    { "id": "p2", "title": "Product 2", "subtitle": "Popular choice" }
  ]
}
```

### Send image or document

```bash
POST /api/send-media
```

```json
{
  "to": "15551234567",
  "mediaType": "image",
  "mediaUrl": "https://example.com/image.jpg",
  "caption": "Your image"
}
```

This supports:
- image
- video
- audio
- document

## Google Cloud deployment

### Option 1: Cloud Run

```bash
docker build -t gcr.io/<PROJECT_ID>/codeflow-whatsapp .
docker push gcr.io/<PROJECT_ID>/codeflow-whatsapp
gcloud run deploy codeflow-whatsapp \
  --image gcr.io/<PROJECT_ID>/codeflow-whatsapp \
  --platform managed \
  --allow-unauthenticated \
  --region us-central1
```

### Option 2: Compute Engine or VM

Deploy the Docker image on a VM, or run the Node.js app directly with PM2.

## Important note

This connector uses the official Meta Graph API, so the user still needs a valid WhatsApp Business Account and WABA configuration for the final production deployment.

## Project structure

```text
src/
  app.ts
  index.ts
  config/
    env.ts
    waba.ts
  lib/
    meta.ts
```
