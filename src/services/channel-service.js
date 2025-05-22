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

            // Beende die Subscription
            sub.close();
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

        // Veröffentliche das Event
        relayPool.publish(relays, signedEvent)
          .then(() => {
            resolve(signedEvent);
          })
          .catch(publishError => {
            console.error('Error publishing event:', publishError);
            reject(publishError);
          });
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
      '#e': [channelId], // Filtere nach Kanal-ID im e-Tag
      limit: isInitialLoad ? 50 : 0
    }
  ];

  // Prüfe, ob die Filter gültig sind
  if (!channelId) {
    throw new Error('Invalid channelId');
  }

  // Erstelle die Subscription mit der SimplePool-API
  const sub = relayPool.subscribe(relays, filters, {
    onevent: callbacks.onEvent || (() => {}),
    oneose: callbacks.onEose || (() => {})
  });

  return sub;
}
