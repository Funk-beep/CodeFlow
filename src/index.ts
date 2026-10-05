import app from './app';
import { config } from './config/env';

app.listen(config.port, () => {
  console.log(`[CodeFlow] WhatsApp connector listening on port ${config.port}`);
});
