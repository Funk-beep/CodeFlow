export type WabaConfig = {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  webhookVerifyToken?: string;
  webhookUrl?: string;
};

let activeConfig: WabaConfig | null = null;

export function setActiveWabaConfig(config: WabaConfig) {
  activeConfig = config;
}

export function getActiveWabaConfig(): WabaConfig | null {
  return activeConfig;
}

export function clearWabaConfig() {
  activeConfig = null;
}
