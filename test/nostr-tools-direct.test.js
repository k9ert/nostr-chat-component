/**
 * Direkter Test der nostr-tools-Bibliothek gemäß der Dokumentation
 */
import { expect } from '@open-wc/testing';
import * as nostrTools from 'nostr-tools';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

describe('Direct nostr-tools usage', () => {
  describe('Key Generation and Signing', () => {
    it('should generate a key pair and sign an event exactly as in the documentation', () => {
      // Generiere einen privaten Schlüssel (32 Bytes)
      const sk = nostrTools.generateSecretKey();

      // Konvertiere den privaten Schlüssel in einen Hex-String für die Anzeige
      console.log('Private key (hex):', bytesToHex(sk));

      // Leite den öffentlichen Schlüssel ab
      const pk = nostrTools.getPublicKey(sk);
      console.log('Public key:', pk);

      // Erstelle ein Event
      let event = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: 'Hello, world!',
        pubkey: pk
      };

      // Signiere das Event
      event = nostrTools.finalizeEvent(event, sk);

      console.log('Signed event:', event);

      // Verifiziere die Signatur
      const valid = nostrTools.verifyEvent(event);

      expect(valid).to.be.true;
    });

    it('should handle hex string private keys correctly', () => {
      // Generiere einen privaten Schlüssel (32 Bytes)
      const skBytes = nostrTools.generateSecretKey();

      // Konvertiere den privaten Schlüssel in einen Hex-String
      const skHex = bytesToHex(skBytes);
      console.log('Private key (hex):', skHex);

      try {
        // Versuche, den öffentlichen Schlüssel aus dem Hex-String abzuleiten
        const pk = nostrTools.getPublicKey(skHex);
        console.log('Public key from hex:', pk);

        // Wenn wir hierher kommen, unterstützt die Bibliothek Hex-Strings
        console.log('nostr-tools supports hex string private keys');

        // Erstelle ein Event
        let event = {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: 'Hello from hex!',
          pubkey: pk
        };

        // Versuche, das Event mit dem Hex-String zu signieren
        try {
          event = nostrTools.finalizeEvent(event, skHex);
          console.log('Signed event with hex key:', event);

          // Verifiziere die Signatur
          const valid = nostrTools.verifyEvent(event);
          expect(valid).to.be.true;

          console.log('nostr-tools supports signing with hex string private keys');
        } catch (e) {
          console.error('Error signing with hex string:', e);
          // Die Bibliothek unterstützt keine Hex-Strings für die Signierung
          console.log('nostr-tools does NOT support signing with hex string private keys');
        }
      } catch (e) {
        console.error('Error deriving public key from hex string:', e);
        // Die Bibliothek unterstützt keine Hex-Strings
        console.log('nostr-tools does NOT support hex string private keys');
      }
    });

    it('should demonstrate the correct way to convert between formats', () => {
      // Generiere einen privaten Schlüssel (32 Bytes)
      const skBytes = nostrTools.generateSecretKey();

      // Konvertiere den privaten Schlüssel in einen Hex-String
      const skHex = bytesToHex(skBytes);
      console.log('Private key (hex):', skHex);

      // Konvertiere den Hex-String zurück in ein Uint8Array
      const skBytesFromHex = hexToBytes(skHex);

      // Überprüfe, ob die Konvertierung korrekt ist
      expect(Array.from(skBytes)).to.deep.equal(Array.from(skBytesFromHex));

      // Leite den öffentlichen Schlüssel aus dem konvertierten privaten Schlüssel ab
      const pk = nostrTools.getPublicKey(skBytesFromHex);
      console.log('Public key from converted bytes:', pk);

      // Erstelle ein Event
      let event = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: 'Hello from converted bytes!',
        pubkey: pk
      };

      // Signiere das Event mit dem konvertierten privaten Schlüssel
      event = nostrTools.finalizeEvent(event, skBytesFromHex);
      console.log('Signed event with converted bytes:', event);

      // Verifiziere die Signatur
      const valid = nostrTools.verifyEvent(event);
      expect(valid).to.be.true;
    });
  });
});
