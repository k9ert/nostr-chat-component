/**
 * Relay-Pool für Nostr
 * @module relay-pool
 *
 * Dieses Modul verwendet die SimplePool-Klasse aus nostr-tools, um einen Relay-Pool zu implementieren.
 */

import { SimplePool } from 'nostr-tools';

// Erweitere die SimplePool-Klasse, um bessere Fehlerbehandlung zu bieten
class EnhancedSimplePool extends SimplePool {
  constructor() {
    super();

    // Überschreibe die Methoden, um bessere Fehlerbehandlung zu bieten
    const originalOnNotice = this.onnotice;
    this.onnotice = (relay, notice) => {
      console.log(`Notice from relay ${relay.url}: ${notice}`);
      if (originalOnNotice) {
        originalOnNotice(relay, notice);
      }
    };

    const originalOnError = this.onerror;
    this.onerror = (relay, error) => {
      console.error(`Error from relay ${relay.url}:`, error);
      if (originalOnError) {
        originalOnError(relay, error);
      }
    };

    const originalOnConnect = this.onconnect;
    this.onconnect = (relay) => {
      console.log(`Connected to relay: ${relay.url}`);
      if (originalOnConnect) {
        originalOnConnect(relay);
      }
    };

    const originalOnDisconnect = this.ondisconnect;
    this.ondisconnect = (relay) => {
      console.log(`Disconnected from relay: ${relay.url}`);
      if (originalOnDisconnect) {
        originalOnDisconnect(relay);
      }
    };
  }

  // Überschreibe die publish-Methode, um Logging hinzuzufügen
  publish(relays, event) {
    console.log(`Publishing event to relays: ${relays.join(', ')}`);
    return super.publish(relays, event);
  }

  // Überschreibe die subscribe-Methode, um bessere Fehlerbehandlung zu bieten
  subscribe(relays, filters, callbacks) {
    console.log(`Subscribing to relays: ${relays.join(', ')} with filters:`, filters);

    // Erweitere die Callbacks, um bessere Fehlerbehandlung zu bieten
    const enhancedCallbacks = {
      onevent: (event) => {
        try {
          if (callbacks.onevent) {
            callbacks.onevent(event);
          }
        } catch (error) {
          console.error(`Error in onevent callback:`, error);
        }
      },
      oneose: () => {
        try {
          if (callbacks.oneose) {
            callbacks.oneose();
          }
        } catch (error) {
          console.error(`Error in oneose callback:`, error);
        }
      }
    };

    return super.subscribe(relays, filters, enhancedCallbacks);
  }
}

// Exportiere die SimplePool-Klasse direkt
export { SimplePool };

// Singleton-Instanz des Relay-Pools
let relayPoolInstance = null;

/**
 * Initialisiert einen Relay-Pool
 * @returns {EnhancedSimplePool} - Relay-Pool
 */
export function initRelayPool() {
  if (!relayPoolInstance) {
    relayPoolInstance = new EnhancedSimplePool();
  }
  return relayPoolInstance;
}
