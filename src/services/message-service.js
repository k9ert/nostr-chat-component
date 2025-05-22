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
 * @param {string} channelEventId - Event-ID des Kanal-Erstellungsereignisses (optional)
 * @returns {Promise} - Promise, das aufgelöst wird, wenn die Nachricht gesendet wurde
 */
export function sendMessage(content, userPublicKey, userPrivateKey, channelId, relayPool, relays, channelEventId = null) {
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
        tags: channelEventId ? [
          // Für Nostr-Kanäle muss das e-Tag die Event-ID des Kanal-Erstellungsereignisses enthalten
          // Laut NIP-28: ["e", "<channel_creation_event_id>", "relay", "root"]
          ['e', channelEventId, '', 'root']
        ] : [
          // Wenn keine Event-ID des Kanal-Erstellungsereignisses vorhanden ist,
          // verwenden wir eine leere Tag-Liste
        ],
        content: content
      };

      // Fail fast: Prüfe sofort, ob der private Schlüssel leer ist
      if (!userPrivateKey) {
        throw new Error('Private key is empty or undefined in sendMessage');
      }

      // Stelle sicher, dass der private Schlüssel ein String ist
      const privateKeyStr = String(userPrivateKey);

      // Debug-Log der Nachricht vor dem Senden
      console.log('Sending kind 42 message (channel message):', {
        event: event,
        channelId: channelId,
        content: content,
        tags: event.tags,
        kind: EVENT_TYPES.CHANNEL_MESSAGE
      });

      // Signiere das Event
      const signedEvent = signEvent(event, privateKeyStr);

      // Debug-Log des signierten Events
      console.log('Signed event:', signedEvent);

      try {
        // Veröffentliche das signierte Event
        // SimplePool.publish gibt ein Promise zurück, das aufgelöst wird, wenn das Event veröffentlicht wurde
        // oder abgelehnt wird, wenn ein Fehler auftritt
        console.log('Publishing to relays:', relays);
        relayPool.publish(relays, signedEvent);

        // Löse das Promise mit dem signierten Event auf
        resolve(signedEvent);
      } catch (publishError) {
        console.error('Error publishing message:', publishError);
        reject(publishError);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      reject(error);
    }
  });
}
