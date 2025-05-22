/**
 * Konstanten für die Nostr-Chat-Komponente
 */

// Standard-Relays
export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.snort.social'
];

// Event-Typen
export const EVENT_TYPES = {
  METADATA: 0,
  TEXT_NOTE: 1,
  RECOMMEND_SERVER: 2,
  CONTACT_LIST: 3,
  ENCRYPTED_DIRECT_MESSAGE: 4,
  DELETE: 5,
  REPOST: 6,
  REACTION: 7,
  CHANNEL_CREATE: 40,
  CHANNEL_METADATA: 41,
  CHANNEL_MESSAGE: 42,
  CHANNEL_HIDE_MESSAGE: 43,
  CHANNEL_MUTE_USER: 44,
  REPORT: 1984,
  ZAP_REQUEST: 9734,
  ZAP_RECEIPT: 9735
};

// Maximale Anzahl von Nachrichten im Cache
export const MAX_CACHED_MESSAGES = 100;

// Maximale Anzahl von Profilinformationen im Cache
export const MAX_CACHED_PROFILES = 50;

// Zeitintervall für Verbindungsversuche (in ms)
export const RECONNECT_INTERVAL = 5000;

// Maximale Anzahl von Verbindungsversuchen
export const MAX_RECONNECT_ATTEMPTS = 5;

// Standardwerte für die Komponente
export const DEFAULT_SETTINGS = {
  relay: 'wss://relay.damus.io',
  channel: 'nostr-chat-component-demo',
  theme: 'light',
  showAvatars: true,
  maxMessages: 50
};
