/**
 * Kanal-Service für Nostr
 * @module channel-service
 */

import { EVENT_TYPES } from '../utils/constants.js';
import { signEvent } from './crypto-service.js';

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
  // Fail fast: Prüfe sofort, ob die Parameter gültig sind
  if (!userPrivateKey) {
    throw new Error('Private key is empty or undefined in createOrFindChannel');
  }
  if (!userPublicKey) {
    throw new Error('Public key is empty or undefined in createOrFindChannel');
  }
  if (!channelId) {
    throw new Error('Channel ID is empty or undefined in createOrFindChannel');
  }
  if (!relayPool) {
    throw new Error('Relay pool is empty or undefined in createOrFindChannel');
  }
  if (!relays || !Array.isArray(relays) || relays.length === 0) {
    throw new Error('Relays must be a non-empty array in createOrFindChannel');
  }

  // Stelle sicher, dass der private Schlüssel ein String ist
  const privateKeyStr = String(userPrivateKey);

  return new Promise((resolve, reject) => {
    try {
      console.log(`Searching for channel with ID: ${channelId} on relays:`, relays);

      // Erstelle einen Filter für die Suche nach dem Kanal
      const filter = {
        kinds: [EVENT_TYPES.CHANNEL_CREATE],
        '#d': [channelId], // Verwende #d, da wir in createChannel auch d-Tags verwenden
        limit: 1
      };

      console.log('Using filter:', filter);

      let channelFound = false;
      let timeoutId = null;

      // Erstelle eine Subscription, um nach dem Kanal zu suchen
      const sub = relayPool.subscribe(
        relays,
        filter, // Einzelner Filter, kein Array
        {
          onevent(event) {
            console.log('Found existing channel:', event);
            channelFound = true;

            // Wenn wir einen Timeout gesetzt haben, löschen wir ihn
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }

            resolve(event);
          },
          oneose() {
            console.log('End of stored events for channel search');

            // Wenn der Kanal nicht gefunden wurde, warten wir noch einen Moment
            // und erstellen ihn dann, falls er immer noch nicht gefunden wurde
            if (!channelFound) {
              console.log('Channel not found in initial search, waiting briefly before creating...');

              // Setze einen Timeout, um dem Relay Zeit zu geben, das Event zu verarbeiten
              timeoutId = setTimeout(() => {
                // Prüfe noch einmal, ob der Kanal gefunden wurde
                if (!channelFound) {
                  console.log('Channel still not found, creating new channel');

                  // Wenn der Kanal nicht gefunden wurde, erstelle ihn
                  createChannel(relayPool, relays, channelId, userPublicKey, privateKeyStr)
                    .then(event => {
                      resolve(event);
                    })
                    .catch(error => {
                      console.error('Error creating channel:', error);
                      reject(error);
                    });
                }
              }, 1000); // Warte 1 Sekunde
            }
          }
        }
      );
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
          // PoW deaktiviert, da zu rechenintensiv
          // ['nonce', '0', '28'] // PoW-Anforderung: 28 Bits (ca. 7 führende Nullen im Hex-String)
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

      // Debug-Log der Kanal-Erstellung
      console.log('Creating channel (kind 40 event):', {
        event: event,
        channelId: channelId,
        tags: event.tags,
        kind: EVENT_TYPES.CHANNEL_CREATE
      });

      try {
        // Signiere das Event
        const signedEvent = signEvent(event, privateKeyStr);

        // Debug-Log des signierten Events
        console.log('Signed channel event:', signedEvent);

        try {
          // Veröffentliche das Event
          // SimplePool.publish gibt ein Promise zurück, das aufgelöst wird, wenn das Event veröffentlicht wurde
          // oder abgelehnt wird, wenn ein Fehler auftritt
          console.log('Publishing channel to relays:', relays);
          relayPool.publish(relays, signedEvent);

          // Löse das Promise mit dem signierten Event auf
          resolve(signedEvent);
        } catch (publishError) {
          console.error('Error publishing event:', publishError);
          reject(publishError);
        }
      } catch (signError) {
        console.error('Error signing event:', signError);
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
 * @param {Object} callbacks - Callback-Funktionen für Events
 * @param {string} [channelEventId] - Event-ID des Kanal-Erstellungsereignisses (optional)
 * @returns {Object} - Subscription-Objekt
 */
export function subscribeToChannel(relayPool, relays, channelId, userPublicKey, isInitialLoad, callbacks = {}, channelEventId = null) {
  // Erstelle den Filter (als einzelnes Objekt, nicht als Array)
  const filter = {
    kinds: [EVENT_TYPES.CHANNEL_MESSAGE], // 42 für Kanal-Nachrichten
    limit: isInitialLoad ? 50 : 0
  };

  // Wenn wir eine channelEventId haben, fügen wir sie als e-Tag-Filter hinzu
  if (channelEventId) {
    filter['#e'] = [channelEventId];
    console.log(`Adding channel event ID filter for ${channelEventId}`);
  } else {
    console.log('No channel event ID provided, using broader filter');
  }

  console.log('Creating subscription for channel messages with filter:', filter);

  // Prüfe, ob die Filter gültig sind
  if (!channelId) {
    throw new Error('Invalid channelId');
  }

  // Definiere die Callbacks
  const eventCallback = callbacks.onEvent || (() => {});
  const eoseCallback = callbacks.onEose || (() => {});

  // Erstelle die Subscription mit der SimplePool-API
  const sub = relayPool.subscribe(relays, filter, {
    onevent(event) {
      // Zusätzliche Prüfung: Wenn wir eine channelEventId haben, prüfen wir, ob das Event ein e-Tag mit dieser ID hat
      if (channelEventId) {
        const eTag = event.tags.find(tag => tag[0] === 'e');
        if (!eTag || eTag[1] !== channelEventId) {
          console.log(`Skipping event with wrong e-tag: ${JSON.stringify(eTag)}, expected: ${channelEventId}`);
          return;
        }
      }

      eventCallback(event);
    },
    oneose() {
      eoseCallback();
    }
  });

  return sub;
}
