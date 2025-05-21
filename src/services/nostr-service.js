/**
 * Nostr-Dienst für die Nostr-Chat-Komponente
 */
import { EVENT_TYPES, DEFAULT_RELAYS, RECONNECT_INTERVAL, MAX_RECONNECT_ATTEMPTS } from '../utils/constants.js';
import { signEvent } from './crypto-service.js';

// Klasse für den Relay-Pool
class RelayPool {
  constructor() {
    this.relays = new Map();
    this.subs = new Map();
    this.connectedRelays = new Set();
    this.reconnectAttempts = new Map();
    this.eventListeners = new Map();
  }

  /**
   * Verbindet mit einem Relay
   * @param {string} url - URL des Relays
   * @returns {Promise} - Promise, das aufgelöst wird, wenn die Verbindung hergestellt wurde
   */
  connect(url) {
    return new Promise((resolve, reject) => {
      if (this.relays.has(url) && this.relays.get(url).readyState === WebSocket.OPEN) {
        resolve(this.relays.get(url));
        return;
      }

      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log(`Connected to relay: ${url}`);
        this.connectedRelays.add(url);
        this.reconnectAttempts.set(url, 0);
        resolve(ws);
      };

      ws.onclose = () => {
        console.log(`Disconnected from relay: ${url}`);
        this.connectedRelays.delete(url);
        this.reconnect(url);
      };

      ws.onerror = (error) => {
        console.error(`Error connecting to relay: ${url}`, error);
        reject(error);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(url, data);
        } catch (error) {
          console.error(`Error parsing message from relay: ${url}`, error);
        }
      };

      this.relays.set(url, ws);
    });
  }

  /**
   * Verbindet mit mehreren Relays
   * @param {Array} urls - URLs der Relays
   * @returns {Promise} - Promise, das aufgelöst wird, wenn alle Verbindungen hergestellt wurden
   */
  connectAll(urls) {
    return Promise.all(urls.map(url => this.connect(url)));
  }

  /**
   * Versucht, die Verbindung zu einem Relay wiederherzustellen
   * @param {string} url - URL des Relays
   */
  reconnect(url) {
    const attempts = this.reconnectAttempts.get(url) || 0;

    if (attempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log(`Max reconnect attempts reached for relay: ${url}`);
      return;
    }

    this.reconnectAttempts.set(url, attempts + 1);

    setTimeout(() => {
      console.log(`Reconnecting to relay: ${url} (attempt ${attempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
      this.connect(url).catch(() => {
        // Fehler werden bereits in connect() behandelt
      });
    }, RECONNECT_INTERVAL);
  }

  /**
   * Behandelt eine Nachricht von einem Relay
   * @param {string} url - URL des Relays
   * @param {Array} data - Nachrichtendaten
   */
  handleMessage(url, data) {
    console.log('[DEBUG] handleMessage - START - url:', url);
    console.log('[DEBUG] handleMessage - data:', data);

    if (!Array.isArray(data) || data.length < 2) {
      console.log('[DEBUG] handleMessage - Invalid data format, skipping');
      return;
    }

    const [type, subId, ...rest] = data;
    console.log('[DEBUG] handleMessage - type:', type, 'subId:', subId, 'rest:', rest);

    if (type === 'EVENT' && this.subs.has(subId)) {
      const event = rest[0];
      console.log('[DEBUG] handleMessage - EVENT - subId:', subId);
      console.log('[DEBUG] handleMessage - event:', event);
      console.log('[DEBUG] handleMessage - event.content:', event.content);
      console.log('[DEBUG] handleMessage - event.kind:', event.kind);
      console.log('[DEBUG] handleMessage - event.pubkey:', event.pubkey);
      console.log('[DEBUG] handleMessage - event.tags:', event.tags);

      // Prüfe, ob die Subscription existiert
      const sub = this.subs.get(subId);
      console.log('[DEBUG] handleMessage - subscription:', sub);

      // Emittiere das Event
      sub.emit('event', event);
      console.log('[DEBUG] handleMessage - Event emitted');
    } else if (type === 'EOSE' && this.subs.has(subId)) {
      console.log('[DEBUG] handleMessage - EOSE - subId:', subId);

      // Prüfe, ob die Subscription existiert
      const sub = this.subs.get(subId);
      console.log('[DEBUG] handleMessage - subscription:', sub);

      // Emittiere das EOSE-Event
      sub.emit('eose');
      console.log('[DEBUG] handleMessage - EOSE emitted');
    } else if (type === 'OK') {
      // OK-Nachrichten werden vom Relay gesendet, wenn ein Event veröffentlicht wurde
      console.log('[DEBUG] handleMessage - OK - event_id:', subId, 'success:', rest[0], 'message:', rest[1]);

      // Wenn die Veröffentlichung fehlgeschlagen ist, geben wir eine Warnung aus
      if (!rest[0]) {
        console.warn('[DEBUG] handleMessage - Event publication failed:', rest[1]);
      }
    } else if (type === 'NOTICE') {
      console.log(`[DEBUG] handleMessage - NOTICE from relay ${url}: ${rest[0]}`);
    } else {
      console.log('[DEBUG] handleMessage - Unknown message type or subscription not found:', type, subId);
    }
  }

  /**
   * Erstellt eine Subscription
   * @param {Array} relays - URLs der Relays
   * @param {Array} filters - Filter für die Subscription
   * @returns {Object} - Subscription-Objekt
   */
  sub(relays, filters) {
    const subId = Math.random().toString(36).substring(2, 15);

    // Speichere die Werte in lokalen Variablen, um sie in den Closures zu verwenden
    const relaysList = [...relays];
    const filtersList = [...filters];
    const relayPool = this;

    const sub = {
      id: subId,
      filters: filtersList,
      relays: relaysList,
      listeners: {},

      on(event, callback) {
        if (!this.listeners[event]) {
          this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
        return this;
      },

      emit(event, data) {
        if (this.listeners[event]) {
          this.listeners[event].forEach(callback => callback(data));
        }
        return this;
      },

      unsub() {
        // Verwende die lokalen Variablen
        this.relays.forEach(url => {
          const relay = relayPool.relays.get(url);
          if (relay && relay.readyState === WebSocket.OPEN) {
            relay.send(JSON.stringify(['CLOSE', this.id]));
          }
        });
        relayPool.subs.delete(this.id);
        return this;
      },

      relayPool: relayPool
    };

    this.subs.set(subId, sub);

    relaysList.forEach(url => {
      this.connect(url).then(relay => {
        relay.send(JSON.stringify(['REQ', subId, ...filtersList]));
      }).catch(error => {
        console.error(`Error subscribing to relay: ${url}`, error);
      });
    });

    return sub;
  }

  /**
   * Veröffentlicht ein Event
   * @param {Array} relays - URLs der Relays
   * @param {Object} event - Zu veröffentlichendes Event
   */
  publish(relays, event) {
    relays.forEach(url => {
      this.connect(url).then(relay => {
        relay.send(JSON.stringify(['EVENT', event]));
      }).catch(error => {
        console.error(`Error publishing to relay: ${url}`, error);
      });
    });
  }

  /**
   * Schließt alle Verbindungen
   */
  close() {
    this.relays.forEach((relay, url) => {
      if (relay.readyState === WebSocket.OPEN) {
        relay.close();
      }
    });

    this.relays.clear();
    this.subs.clear();
    this.connectedRelays.clear();
    this.reconnectAttempts.clear();
  }
}

// Singleton-Instanz des Relay-Pools
let relayPoolInstance = null;

/**
 * Initialisiert den Relay-Pool
 * @returns {Object} - Relay-Pool
 */
export function initRelayPool() {
  if (!relayPoolInstance) {
    relayPoolInstance = new RelayPool();
  }
  return relayPoolInstance;
}

/**
 * Erstellt oder findet einen Kanal
 * @param {Object} relayPool - Relay-Pool
 * @param {Array} relays - URLs der Relays
 * @param {string} channelId - Kanal-ID
 * @param {string} userPublicKey - Öffentlicher Schlüssel des Benutzers
 * @param {string} userPrivateKey - Privater Schlüssel des Benutzers
 * @returns {Promise} - Promise, das aufgelöst wird, wenn der Kanal erstellt oder gefunden wurde
 */
export function createOrFindChannel(relayPool, relays, channelId, userPublicKey, userPrivateKey) {
  // Fail fast: Prüfe sofort, ob der private Schlüssel leer ist
  if (!userPrivateKey) {
    throw new Error('Private key is empty or undefined in createOrFindChannel');
  }

  // Stelle sicher, dass der private Schlüssel ein String ist
  const privateKeyStr = String(userPrivateKey);

  return new Promise((resolve, reject) => {
    try {
      // Erstelle eine Subscription, um nach dem Kanal zu suchen
      const sub = relayPool.sub(relays, [
        {
          kinds: [EVENT_TYPES.CHANNEL_CREATE],
          '#d': [channelId],
          limit: 1
        }
      ]);

      let channelFound = false;

      // Event-Handler für gefundene Events
      sub.on('event', (event) => {
        channelFound = true;
        sub.unsub();
        resolve(event);
      });

      // Event-Handler für das Ende der Subscription
      sub.on('eose', () => {
        if (!channelFound) {
          try {
            // Wenn der Kanal nicht gefunden wurde, erstelle ihn
            createChannel(relayPool, relays, channelId, userPublicKey, privateKeyStr)
              .then(event => {
                resolve(event);
              })
              .catch(error => {
                console.error('Error creating channel:', error);
                reject(error);
              });
          } catch (error) {
            console.error('Exception in createChannel:', error);
            reject(error);
          }
        }

        sub.unsub();
      });
    } catch (error) {
      console.error('Exception in createOrFindChannel:', error);
      reject(error);
    }
  });
}

/**
 * Erstellt einen Kanal
 * @param {Object} relayPool - Relay-Pool
 * @param {Array} relays - URLs der Relays
 * @param {string} channelId - Kanal-ID
 * @param {string} userPublicKey - Öffentlicher Schlüssel des Benutzers
 * @param {string} userPrivateKey - Privater Schlüssel des Benutzers
 * @returns {Promise} - Promise, das aufgelöst wird, wenn der Kanal erstellt wurde
 */
export function createChannel(relayPool, relays, channelId, userPublicKey, userPrivateKey) {
  return new Promise((resolve, reject) => {
    try {
      // Prüfe, ob die Parameter gültig sind
      if (!channelId) {
        throw new Error('Invalid channelId');
      }

      if (!userPublicKey) {
        throw new Error('Invalid userPublicKey');
      }

      // Erstelle das Event
      const event = {
        kind: EVENT_TYPES.CHANNEL_CREATE,
        pubkey: userPublicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['d', channelId],
          ['name', channelId]
        ],
        content: JSON.stringify({
          name: channelId,
          about: `Channel for ${channelId}`,
          picture: ''
        })
      };

      // Fail fast: Prüfe sofort, ob der private Schlüssel leer ist
      if (!userPrivateKey) {
        throw new Error('Private key is empty or undefined in createChannel');
      }

      // Stelle sicher, dass der private Schlüssel ein String ist
      const privateKeyStr = String(userPrivateKey);

      try {
        // Signiere das Event
        const signedEvent = signEvent(event, privateKeyStr);

        // Veröffentliche das signierte Event
        relayPool.publish(relays, signedEvent);

        resolve(signedEvent);
      } catch (signError) {
        console.error('Error signing or publishing event:', signError);
        reject(signError);
      }
    } catch (error) {
      console.error('Error creating channel:', error);
      reject(error);
    }
  });
}

/**
 * Abonniert einen Kanal
 * @param {Object} relayPool - Relay-Pool
 * @param {Array} relays - URLs der Relays
 * @param {string} channelId - Kanal-ID
 * @param {string} userPublicKey - Öffentlicher Schlüssel des Benutzers
 * @param {boolean} isInitialLoad - Gibt an, ob es sich um das initiale Laden handelt
 * @returns {Object} - Subscription-Objekt
 */
export function subscribeToChannel(relayPool, relays, channelId, userPublicKey, isInitialLoad) {
  console.log('[DEBUG] subscribeToChannel - START');
  console.log('[DEBUG] subscribeToChannel - channelId:', channelId);
  console.log('[DEBUG] subscribeToChannel - userPublicKey:', userPublicKey);
  console.log('[DEBUG] subscribeToChannel - isInitialLoad:', isInitialLoad);
  console.log('[DEBUG] subscribeToChannel - relays:', relays);

  // Erstelle die Filter
  const filters = [
    {
      kinds: [EVENT_TYPES.CHANNEL_MESSAGE], // 42 für Kanal-Nachrichten
      '#e': [channelId], // Filtere nach Kanal-ID im e-Tag
      limit: isInitialLoad ? 50 : 0
    }
  ];

  // Debug-Ausgabe der Filter-Struktur
  console.log('[DEBUG] subscribeToChannel - Filter structure:');
  console.log('[DEBUG] subscribeToChannel - kinds:', filters[0].kinds);
  console.log('[DEBUG] subscribeToChannel - #e:', filters[0]['#e']);
  console.log('[DEBUG] subscribeToChannel - limit:', filters[0].limit);

  // Prüfe, ob die Filter gültig sind
  if (!channelId) {
    console.error('[DEBUG] subscribeToChannel - Invalid channelId:', channelId);
    throw new Error('Invalid channelId');
  }

  console.log('[DEBUG] subscribeToChannel - filters:', filters);

  // Erstelle die Subscription
  const sub = relayPool.sub(relays, filters);
  console.log('[DEBUG] subscribeToChannel - subscription created:', sub);

  // Füge Debug-Handler hinzu
  sub.on('event', (event) => {
    console.log('[DEBUG] subscribeToChannel - Received event:', event);
    console.log('[DEBUG] subscribeToChannel - Event content:', event.content);
  });

  sub.on('eose', () => {
    console.log('[DEBUG] subscribeToChannel - End of stored events');
  });

  return sub;
}

/**
 * Sendet eine Nachricht an einen Kanal
 * @param {string} content - Nachrichteninhalt
 * @param {string} userPublicKey - Öffentlicher Schlüssel des Benutzers
 * @param {string} userPrivateKey - Privater Schlüssel des Benutzers
 * @param {string} channelId - Kanal-ID
 * @param {Object} relayPool - Relay-Pool
 * @param {Array} relays - URLs der Relays
 * @returns {Promise} - Promise, das aufgelöst wird, wenn die Nachricht gesendet wurde
 */
export function sendMessage(content, userPublicKey, userPrivateKey, channelId, relayPool, relays) {
  return new Promise((resolve, reject) => {
    try {
      if (!content || content.trim() === '') {
        reject(new Error('Message content cannot be empty'));
        return;
      }

      // Prüfe, ob die Parameter gültig sind
      if (!channelId) {
        throw new Error('Invalid channelId');
      }

      if (!userPublicKey) {
        throw new Error('Invalid userPublicKey');
      }

      // Erstelle das Event
      const event = {
        kind: EVENT_TYPES.CHANNEL_MESSAGE, // 42 für Kanal-Nachrichten
        pubkey: userPublicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          // Für Nostr-Kanäle sollte das e-Tag die Kanal-ID enthalten
          // Laut NIP-28 sollte das Format sein: ['e', <channel_id>, <relay_url>, <marker>]
          // Aber wir lassen relay_url und marker weg, da sie optional sind
          ['e', channelId]
        ],
        content: content
      };

      // Fail fast: Prüfe sofort, ob der private Schlüssel leer ist
      if (!userPrivateKey) {
        throw new Error('Private key is empty or undefined in sendMessage');
      }

      // Stelle sicher, dass der private Schlüssel ein String ist
      const privateKeyStr = String(userPrivateKey);

      // Signiere das Event
      const signedEvent = signEvent(event, privateKeyStr);

      // Veröffentliche das signierte Event
      relayPool.publish(relays, signedEvent);

      resolve(signedEvent);
    } catch (error) {
      console.error('[DEBUG] sendMessage - error:', error);
      reject(error);
    }
  });
}
