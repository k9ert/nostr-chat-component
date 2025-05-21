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
    if (!Array.isArray(data) || data.length < 2) {
      return;
    }

    const [type, subId, ...rest] = data;

    if (type === 'EVENT' && this.subs.has(subId)) {
      const event = rest[0];
      this.subs.get(subId).emit('event', event);
    } else if (type === 'EOSE' && this.subs.has(subId)) {
      this.subs.get(subId).emit('eose');
    } else if (type === 'NOTICE') {
      console.log(`Notice from relay ${url}: ${rest[0]}`);
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
    
    const sub = {
      id: subId,
      filters,
      relays,
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
        relays.forEach(url => {
          const relay = this.relayPool.relays.get(url);
          if (relay && relay.readyState === WebSocket.OPEN) {
            relay.send(JSON.stringify(['CLOSE', subId]));
          }
        });
        this.relayPool.subs.delete(subId);
        return this;
      },
      
      relayPool: this
    };
    
    this.subs.set(subId, sub);
    
    relays.forEach(url => {
      this.connect(url).then(relay => {
        relay.send(JSON.stringify(['REQ', subId, ...filters]));
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
  return new Promise((resolve, reject) => {
    // Suche nach dem Kanal
    const sub = relayPool.sub(relays, [
      {
        kinds: [EVENT_TYPES.CHANNEL_CREATE],
        '#d': [channelId],
        limit: 1
      }
    ]);
    
    let channelFound = false;
    
    sub.on('event', (event) => {
      channelFound = true;
      resolve(event);
    });
    
    sub.on('eose', () => {
      if (!channelFound) {
        // Wenn der Kanal nicht gefunden wurde, erstelle ihn
        createChannel(relayPool, relays, channelId, userPublicKey, userPrivateKey)
          .then(resolve)
          .catch(reject);
      }
      
      sub.unsub();
    });
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
  return new Promise(async (resolve, reject) => {
    try {
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
      
      // Signiere das Event
      event.id = await signEvent(event, userPrivateKey);
      
      // Veröffentliche das Event
      relayPool.publish(relays, event);
      
      resolve(event);
    } catch (error) {
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
  // Erstelle die Filter
  const filters = [
    {
      kinds: [EVENT_TYPES.CHANNEL_MESSAGE],
      '#e': [channelId],
      limit: isInitialLoad ? 50 : 0
    }
  ];
  
  // Erstelle die Subscription
  return relayPool.sub(relays, filters);
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
  return new Promise(async (resolve, reject) => {
    try {
      if (!content || content.trim() === '') {
        reject(new Error('Message content cannot be empty'));
        return;
      }
      
      // Erstelle das Event
      const event = {
        kind: EVENT_TYPES.CHANNEL_MESSAGE,
        pubkey: userPublicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['e', channelId, '', 'root']
        ],
        content: content
      };
      
      // Signiere das Event
      event.id = await signEvent(event, userPrivateKey);
      
      // Veröffentliche das Event
      relayPool.publish(relays, event);
      
      resolve(event);
    } catch (error) {
      reject(error);
    }
  });
}
