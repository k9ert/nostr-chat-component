/**
 * Kryptografie-Dienst für die Nostr-Chat-Komponente
 */
import { hexToBytes, bytesToHex } from '../utils/helpers.js';

/**
 * Generiert ein neues Schlüsselpaar
 * @returns {Object} - Objekt mit privateKey und publicKey
 */
export async function generateKeyPair() {
  try {
    // Verwende die Web Crypto API
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true,
      ['sign', 'verify']
    );

    const privateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const publicKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);

    // Konvertiere die Schlüssel in Hex-Strings
    const privateKeyHex = bytesToHex(new Uint8Array(privateKey));
    const publicKeyHex = bytesToHex(new Uint8Array(publicKey));

    return {
      privateKey: privateKeyHex,
      publicKey: publicKeyHex
    };
  } catch (error) {
    console.error('Error generating key pair:', error);
    throw error;
  }
}

/**
 * Leitet den öffentlichen Schlüssel aus dem privaten Schlüssel ab
 * @param {string|Uint8Array} privateKey - Privater Schlüssel als Hex-String oder Uint8Array
 * @returns {string} - Öffentlicher Schlüssel als Hex-String
 */
export async function getPublicKey(privateKey) {
  try {
    // Konvertiere den privaten Schlüssel in ein Uint8Array, falls er als Hex-String übergeben wurde
    const privateKeyBytes = typeof privateKey === 'string' ? hexToBytes(privateKey) : privateKey;

    // Importiere den privaten Schlüssel
    const importedPrivateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      privateKeyBytes,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true,
      ['sign']
    );

    // Exportiere den öffentlichen Schlüssel
    const publicKey = await window.crypto.subtle.exportKey('spki', importedPrivateKey);

    // Konvertiere den öffentlichen Schlüssel in einen Hex-String
    return bytesToHex(new Uint8Array(publicKey));
  } catch (error) {
    console.error('Error deriving public key:', error);
    throw error;
  }
}

/**
 * Signiert ein Event
 * @param {Object} event - Zu signierendes Event
 * @param {string|Uint8Array} privateKey - Privater Schlüssel als Hex-String oder Uint8Array
 * @returns {string} - Signatur als Hex-String
 */
export async function signEvent(event, privateKey) {
  try {
    // Konvertiere den privaten Schlüssel in ein Uint8Array, falls er als Hex-String übergeben wurde
    const privateKeyBytes = typeof privateKey === 'string' ? hexToBytes(privateKey) : privateKey;

    // Importiere den privaten Schlüssel
    const importedPrivateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      privateKeyBytes,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      false,
      ['sign']
    );

    // Erstelle die zu signierende Nachricht
    const message = JSON.stringify([
      0,
      event.pubkey,
      event.created_at,
      event.kind,
      event.tags,
      event.content
    ]);

    // Signiere die Nachricht
    const signature = await window.crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      importedPrivateKey,
      new TextEncoder().encode(message)
    );

    // Konvertiere die Signatur in einen Hex-String
    return bytesToHex(new Uint8Array(signature));
  } catch (error) {
    console.error('Error signing event:', error);
    throw error;
  }
}

/**
 * Verifiziert die Signatur eines Events
 * @param {Object} event - Zu verifizierendes Event
 * @returns {boolean} - true, wenn die Signatur gültig ist
 */
export async function verifyEvent(event) {
  try {
    // Importiere den öffentlichen Schlüssel
    const publicKeyBytes = hexToBytes(event.pubkey);
    const importedPublicKey = await window.crypto.subtle.importKey(
      'spki',
      publicKeyBytes,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      false,
      ['verify']
    );

    // Erstelle die zu verifizierende Nachricht
    const message = JSON.stringify([
      0,
      event.pubkey,
      event.created_at,
      event.kind,
      event.tags,
      event.content
    ]);

    // Verifiziere die Signatur
    const signatureBytes = hexToBytes(event.sig);
    return await window.crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      importedPublicKey,
      signatureBytes,
      new TextEncoder().encode(message)
    );
  } catch (error) {
    console.error('Error verifying event:', error);
    return false;
  }
}
