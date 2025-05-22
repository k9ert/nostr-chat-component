/**
 * Relay-Pool für Nostr
 * @module relay-pool
 *
 * Dieses Modul verwendet die SimplePool-Klasse aus nostr-tools, um einen Relay-Pool zu implementieren.
 */

import { SimplePool } from 'nostr-tools';

// Exportiere die SimplePool-Klasse direkt
export { SimplePool };

// Singleton-Instanz des Relay-Pools
let relayPoolInstance = null;

/**
 * Initialisiert einen Relay-Pool
 * @returns {SimplePool} - Relay-Pool
 */
export function initRelayPool() {
  if (!relayPoolInstance) {
    relayPoolInstance = new SimplePool();
  }
  return relayPoolInstance;
}
