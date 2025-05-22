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
  // Fail fast: Prüfe sofort, ob der private Schlüssel leer ist
  if (!userPrivateKey) {
    throw new Error('Private key is empty or undefined in createOrFindChannel');
  }

  // Stelle sicher, dass der private Schlüssel ein String ist
  const privateKeyStr = String(userPrivateKey);

  return new Promise((resolve, reject) => {
    try {
      let channelFound = false;

      // Erstelle eine Subscription, um nach dem Kanal zu suchen
      const sub = relayPool.subscribe(
        relays,
        [
          {
            kinds: [EVENT_TYPES.CHANNEL_CREATE],
            '#d': [channelId],
            limit: 1
          }
        ],
        {
          onevent(event) {
            channelFound = true;
            resolve(event);
          },
          oneose() {
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

            // Wir schließen die Subscription nicht mehr, da wir sie für die gesamte Lebensdauer der Anwendung verwenden
            // Die Subscription wird automatisch geschlossen, wenn sie nicht mehr benötigt wird
            console.log('Not closing subscription to maintain connection');
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
 * @returns {Object} - Subscription-Objekt
 */
export function subscribeToChannel(relayPool, relays, channelId, userPublicKey, isInitialLoad, callbacks = {}) {
  // Erstelle die Filter
  const filters = [
    {
      kinds: [EVENT_TYPES.CHANNEL_MESSAGE], // 42 für Kanal-Nachrichten
      // Wir filtern nach der Kanal-ID im d-Tag, nicht im e-Tag
      // Das e-Tag enthält die Event-ID des Kanal-Erstellungsereignisses
      // Da wir diese ID nicht haben, filtern wir nur nach der Art der Nachricht
      limit: isInitialLoad ? 50 : 0
    }
  ];

  console.log('Creating subscription for channel messages with filter:', filters);

  // Prüfe, ob die Filter gültig sind
  if (!channelId) {
    throw new Error('Invalid channelId');
  }

  // Definiere die Callbacks
  const eventCallback = callbacks.onEvent || (() => {});
  const eoseCallback = callbacks.onEose || (() => {});

  // Erstelle die Subscription mit der SimplePool-API
  const sub = relayPool.subscribe(relays, filters, {
    onevent(event) {
      eventCallback(event);
    },
    oneose() {
      eoseCallback();
    }
  });

  return sub;
}
