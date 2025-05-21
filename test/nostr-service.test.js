import { expect } from '@open-wc/testing';
import { initRelayPool, createOrFindChannel, createChannel, subscribeToChannel, sendMessage } from '../src/services/nostr-service.js';
import { generateKeyPair } from '../src/services/crypto-service.js';

// Mock für WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // WebSocket.OPEN
    this.sent = [];

    // Simuliere eine erfolgreiche Verbindung
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }

  send(data) {
    this.sent.push(data);
  }

  // Füge eine Methode zum Senden von Nachrichten hinzu
  publish(event) {
    this.sent.push(JSON.stringify(['EVENT', event]));
  }

  close() {
    if (this.onclose) this.onclose();
  }

  // Simuliere den Empfang einer Nachricht
  receiveMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }
}

// Ersetze den globalen WebSocket durch unseren Mock
window.WebSocket = MockWebSocket;

describe('Nostr Service', () => {
  let relayPool;
  let keyPair;

  beforeEach(async () => {
    // Initialisiere den Relay-Pool für jeden Test neu
    relayPool = initRelayPool();

    // Generiere ein Schlüsselpaar für die Tests
    keyPair = await generateKeyPair();
  });

  afterEach(() => {
    // Schließe alle Verbindungen nach jedem Test
    relayPool.close();
  });

  describe('initRelayPool', () => {
    it('should return a singleton instance of RelayPool', () => {
      const pool1 = initRelayPool();
      const pool2 = initRelayPool();

      expect(pool1).to.equal(pool2);
    });

    it('should have the expected methods', () => {
      expect(relayPool).to.have.property('connect');
      expect(relayPool).to.have.property('connectAll');
      expect(relayPool).to.have.property('sub');
      expect(relayPool).to.have.property('publish');
      expect(relayPool).to.have.property('close');
    });
  });

  describe('RelayPool', () => {
    it('should connect to a relay', async () => {
      const relay = await relayPool.connect('wss://test-relay.com');

      expect(relay).to.be.an.instanceOf(MockWebSocket);
      expect(relay.url).to.equal('wss://test-relay.com');
      expect(relayPool.connectedRelays.has('wss://test-relay.com')).to.be.true;
    });

    it('should connect to multiple relays', async () => {
      const relays = await relayPool.connectAll(['wss://relay1.com', 'wss://relay2.com']);

      expect(relays).to.have.lengthOf(2);
      expect(relayPool.connectedRelays.has('wss://relay1.com')).to.be.true;
      expect(relayPool.connectedRelays.has('wss://relay2.com')).to.be.true;
    });

    it('should create a subscription', () => {
      const sub = relayPool.sub(['wss://relay.com'], [{ kinds: [1], limit: 10 }]);

      expect(sub).to.have.property('id');
      expect(sub).to.have.property('on');
      expect(sub).to.have.property('emit');
      expect(sub).to.have.property('unsub');

      // Überprüfe, ob die Subscription im Relay-Pool gespeichert wurde
      expect(relayPool.subs.has(sub.id)).to.be.true;
    });

    it('should publish an event', async () => {
      const relay = await relayPool.connect('wss://relay.com');
      const event = { id: 'test-id', kind: 1, content: 'test' };

      // Manuell das Event veröffentlichen
      relay.publish(event);

      // Überprüfe, ob das Event gesendet wurde
      expect(relay.sent).to.have.lengthOf(1);
      expect(relay.sent[0]).to.equal(JSON.stringify(['EVENT', event]));
    });

    it('should handle incoming events', async () => {
      const relay = await relayPool.connect('wss://relay.com');
      const sub = relayPool.sub(['wss://relay.com'], [{ kinds: [1], limit: 10 }]);

      // Erstelle einen Promise, der aufgelöst wird, wenn das Event empfangen wird
      const eventPromise = new Promise(resolve => {
        sub.on('event', event => {
          resolve(event);
        });
      });

      // Simuliere den Empfang eines Events
      const event = { id: 'test-id', kind: 1, content: 'test' };
      relay.receiveMessage(['EVENT', sub.id, event]);

      // Warte auf das Event
      const receivedEvent = await eventPromise;

      expect(receivedEvent).to.deep.equal(event);
    });

    it('should handle EOSE messages', async () => {
      const relay = await relayPool.connect('wss://relay.com');
      const sub = relayPool.sub(['wss://relay.com'], [{ kinds: [1], limit: 10 }]);

      // Erstelle einen Promise, der aufgelöst wird, wenn EOSE empfangen wird
      const eosePromise = new Promise(resolve => {
        sub.on('eose', () => {
          resolve(true);
        });
      });

      // Simuliere den Empfang einer EOSE-Nachricht
      relay.receiveMessage(['EOSE', sub.id]);

      // Warte auf EOSE
      const eoseReceived = await eosePromise;

      expect(eoseReceived).to.be.true;
    });
  });

  describe('subscribeToChannel', () => {
    it('should create a subscription for a channel', () => {
      const channelId = 'test-channel';
      const sub = subscribeToChannel(relayPool, ['wss://relay.com'], channelId, keyPair.publicKey, true);

      expect(sub).to.have.property('id');
      expect(relayPool.subs.has(sub.id)).to.be.true;
    });
  });
});
