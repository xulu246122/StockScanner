export interface NotificationChannelsConfig {
  enableWebhook: boolean;
  webhookUrl: string;
  webhookSecret?: string;

  enableTelegram: boolean;
  telegramBotToken: string;
  telegramChatId: string;

  enableBark: boolean;
  barkServerUrl?: string;
  barkDeviceKey: string;
}

export const DEFAULT_NOTIFICATION_CHANNELS_CONFIG: NotificationChannelsConfig = {
  enableWebhook: false,
  webhookUrl: '',
  webhookSecret: '',

  enableTelegram: false,
  telegramBotToken: '',
  telegramChatId: '',

  enableBark: false,
  barkServerUrl: 'https://api.day.app',
  barkDeviceKey: ''
};

export interface ChannelTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
}
