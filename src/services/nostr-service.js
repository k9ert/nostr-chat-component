/**
 * Nostr-Dienst für die Nostr-Chat-Komponente
 * @module nostr-service
 */
import { SimplePool, initRelayPool } from './relay-pool.js';
import { createOrFindChannel, createChannel, subscribeToChannel } from './channel-service.js';
import { sendMessage } from './message-service.js';

// Exportiere alle Funktionen und Klassen
export {
  SimplePool,
  initRelayPool,
  createOrFindChannel,
  createChannel,
  subscribeToChannel,
  sendMessage
};
