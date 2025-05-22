import { expect } from '@open-wc/testing';
import { generateKeyPair, getPublicKey, signEvent, verifyEvent } from '../src/services/crypto-service.js';

describe('Crypto Service', () => {
  describe('generateKeyPair', () => {
    it('should generate a valid key pair', async () => {
      const { privateKey, publicKey } = await generateKeyPair();

      expect(privateKey).to.be.a('string');
      expect(privateKey).to.have.lengthOf(64); // 32 bytes in hex = 64 characters

      expect(publicKey).to.be.a('string');
      expect(publicKey).to.have.lengthOf(64); // 32 bytes in hex = 64 characters
    });
  });

  describe('getPublicKey', () => {
    it('should derive the correct public key from a private key', async () => {
      const { privateKey, publicKey } = await generateKeyPair();
      const derivedPublicKey = getPublicKey(privateKey);

      expect(derivedPublicKey).to.equal(publicKey);
    });
  });

  describe('signEvent and verifyEvent', () => {
    it('should sign an event and verify the signature', async () => {
      const { privateKey, publicKey } = await generateKeyPair();

      const event = {
        kind: 1,
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: 'Test message'
      };

      // Sign the event
      const signedEvent = signEvent(event, privateKey);

      // Verify the signature
      const isValid = verifyEvent(signedEvent);

      expect(isValid).to.be.true;
    });
  });
});
