/**
 * Nachrichten-Service für Nostr
 * @module message-service
 */

import { EVENT_TYPES } from '../utils/constants.js';
import { signEvent } from './crypto-service.js';

/**
 * Sendet eine Nachricht
 * @param {string} content - Inhalt der Nachricht
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
      relayPool.publish(relays, signedEvent)
        .then(() => {
          resolve(signedEvent);
        })
        .catch(publishError => {
          console.error('Error publishing message:', publishError);
          reject(publishError);
        });
    } catch (error) {
      console.error('Error sending message:', error);
      reject(error);
    }
  });
}
