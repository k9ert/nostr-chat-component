/**
 * Proof-of-Work-Dienst für Nostr-Events
 * @module pow-service
 */

import { bytesToHex } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha256';

/**
 * Berechnet einen Event-Hash
 * @param {Object} event - Das Event, für das der Hash berechnet werden soll
 * @returns {string} - Der Hash des Events als Hex-String
 */
function getEventHash(event) {
  // Erstelle ein Event ohne id und sig
  const eventData = [
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content
  ];

  // Serialisiere das Event
  const serialized = JSON.stringify(eventData);

  // Berechne den Hash
  const hash = sha256(new TextEncoder().encode(serialized));

  // Konvertiere den Hash in einen Hex-String
  return bytesToHex(hash);
}

/**
 * Berechnet Proof-of-Work für ein Event
 * @param {Object} event - Das Event, für das PoW berechnet werden soll
 * @param {number} difficulty - Die Schwierigkeit (Anzahl der führenden Nullbits)
 * @returns {Object} - Das Event mit PoW
 */
export function calculatePow(event, difficulty = 0) {
  // Wenn keine Schwierigkeit angegeben ist, gib das Event unverändert zurück
  if (difficulty <= 0) {
    return event;
  }

  // Erstelle eine Kopie des Events
  const eventCopy = { ...event };

  // Berechne, wie viele führende Nullen wir benötigen (ungefähr difficulty / 4 Zeichen)
  const targetZeros = Math.ceil(difficulty / 4);
  const targetPrefix = '0'.repeat(targetZeros);

  // Füge ein nonce-Tag hinzu, wenn es noch nicht existiert
  let nonceTagIndex = -1;
  for (let i = 0; i < eventCopy.tags.length; i++) {
    if (eventCopy.tags[i][0] === 'nonce') {
      nonceTagIndex = i;
      break;
    }
  }

  if (nonceTagIndex === -1) {
    eventCopy.tags.push(['nonce', '0', difficulty.toString()]);
    nonceTagIndex = eventCopy.tags.length - 1;
  }

  // Starte mit einer zufälligen Nonce
  let nonce = Math.floor(Math.random() * 100000000);
  let hash = '';

  // Erhöhe die Nonce, bis wir einen Hash mit der gewünschten Anzahl führender Nullen haben
  while (true) {
    // Aktualisiere die Nonce im Event
    eventCopy.tags[nonceTagIndex][1] = nonce.toString();

    // Berechne den Hash
    hash = getEventHash(eventCopy);

    // Prüfe, ob der Hash die Anforderungen erfüllt
    if (hash.startsWith(targetPrefix)) {
      break;
    }

    // Erhöhe die Nonce
    nonce++;
  }

  // Setze die ID des Events auf den berechneten Hash
  eventCopy.id = hash;

  return eventCopy;
}

/**
 * Berechnet Proof-of-Work für ein Event vor der Signierung
 * @param {Object} event - Das Event, für das PoW berechnet werden soll
 * @param {number} difficulty - Die Schwierigkeit (Anzahl der führenden Nullbits)
 * @returns {Object} - Das Event mit PoW, bereit zur Signierung
 */
export function calculatePowBeforeSigning(event, difficulty = 0) {
  // Wenn keine Schwierigkeit angegeben ist, gib das Event unverändert zurück
  if (difficulty <= 0) {
    return event;
  }

  console.log(`Calculating PoW with difficulty ${difficulty} bits...`);
  console.time('PoW calculation');

  // Erstelle eine Kopie des Events
  const eventCopy = { ...event };

  // Füge ein nonce-Tag hinzu, wenn es noch nicht existiert
  let nonceTagIndex = -1;
  for (let i = 0; i < eventCopy.tags.length; i++) {
    if (eventCopy.tags[i][0] === 'nonce') {
      nonceTagIndex = i;
      break;
    }
  }

  if (nonceTagIndex === -1) {
    eventCopy.tags.push(['nonce', '0', difficulty.toString()]);
    nonceTagIndex = eventCopy.tags.length - 1;
  }

  // Berechne, wie viele führende Nullen wir benötigen (ungefähr difficulty / 4 Zeichen)
  const targetZeros = Math.ceil(difficulty / 4);
  const targetPrefix = '0'.repeat(targetZeros);

  // Starte mit einer zufälligen Nonce
  let nonce = Math.floor(Math.random() * 100000000);
  let hash = '';

  // Erstelle ein temporäres Event für die Hash-Berechnung
  const tempEvent = {
    kind: eventCopy.kind,
    pubkey: eventCopy.pubkey,
    created_at: eventCopy.created_at,
    tags: [...eventCopy.tags], // Kopiere die Tags
    content: eventCopy.content
  };

  // Erhöhe die Nonce, bis wir einen Hash mit der gewünschten Anzahl führender Nullen haben
  let attempts = 0;
  const maxAttempts = 1000000; // Begrenze die Anzahl der Versuche

  while (attempts < maxAttempts) {
    // Aktualisiere die Nonce im temporären Event
    tempEvent.tags[nonceTagIndex][1] = nonce.toString();

    // Berechne den Hash
    hash = getEventHash(tempEvent);

    // Prüfe, ob der Hash die Anforderungen erfüllt
    if (hash.startsWith(targetPrefix)) {
      console.log(`Found valid nonce after ${attempts} attempts: ${nonce}`);
      console.log(`Hash: ${hash}`);
      break;
    }

    // Erhöhe die Nonce
    nonce++;
    attempts++;

    // Gib alle 10000 Versuche eine Statusmeldung aus
    if (attempts % 10000 === 0) {
      console.log(`Still calculating PoW... ${attempts} attempts so far`);
    }
  }

  if (attempts >= maxAttempts) {
    console.warn(`Could not find valid nonce after ${maxAttempts} attempts. Using last nonce: ${nonce}`);
  }

  // Aktualisiere die Nonce im Event
  eventCopy.tags[nonceTagIndex][1] = nonce.toString();

  console.timeEnd('PoW calculation');
  return eventCopy;
}

/**
 * Prüft, ob ein Event die PoW-Anforderungen erfüllt
 * @param {Object} event - Das zu prüfende Event
 * @returns {boolean} - true, wenn das Event die PoW-Anforderungen erfüllt
 */
export function verifyPow(event) {
  // Finde das nonce-Tag
  const nonceTag = event.tags.find(tag => tag[0] === 'nonce');
  if (!nonceTag || nonceTag.length < 3) {
    return true; // Kein nonce-Tag, also keine PoW-Anforderung
  }

  // Hole die Schwierigkeit aus dem nonce-Tag
  const difficulty = parseInt(nonceTag[2], 10);
  if (isNaN(difficulty) || difficulty <= 0) {
    return true; // Ungültige Schwierigkeit, also keine PoW-Anforderung
  }

  // Berechne, wie viele führende Nullen wir benötigen
  const targetZeros = Math.ceil(difficulty / 4);
  const targetPrefix = '0'.repeat(targetZeros);

  // Berechne den Hash des Events
  const hash = getEventHash(event);

  // Prüfe, ob der Hash die Anforderungen erfüllt
  const isValid = hash.startsWith(targetPrefix);

  if (!isValid) {
    console.warn(`Event does not meet PoW requirements. Required: ${difficulty} bits, Hash: ${hash}`);
  }

  return isValid;
}
