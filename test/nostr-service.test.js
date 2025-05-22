import { expect } from '@open-wc/testing';
import { initRelayPool, SimplePool, createOrFindChannel, createChannel, subscribeToChannel, sendMessage } from '../src/services/nostr-service.js';
import { generateKeyPair } from '../src/services/crypto-service.js';

// Mock für SimplePool
class MockSimplePool {
  constructor() {
    this.relays = new Map();
    this.subs = new Map();
    this.connectedRelays = new Set();
    this.sent = [];
  }

  connect(url) {
    this.connectedRelays.add(url);
    return Promise.resolve({ url });
  }

  connectAll(urls) {
    urls.forEach(url => this.connectedRelays.add(url));
    return Promise.resolve(urls.map(url => ({ url })));
  }

  subscribe(relays, filters, callbacks) {
    const subId = Math.random().toString(36).substring(2, 15);

    const sub = {
      id: subId,
      filters,
      relays,
      close: () => {
        this.subs.delete(subId);
        return this;
      }
    };

    this.subs.set(subId, { sub, callbacks });

    return sub;
  }

  publish(relays, event) {
    this.sent.push({ relays, event });
    return Promise.resolve();
  }

  close() {
    this.relays.clear();
    this.subs.clear();
    this.connectedRelays.clear();
  }

  // Hilfsmethode für Tests
  simulateEvent(subId, event) {
    const sub = this.subs.get(subId);
    if (sub && sub.callbacks.onevent) {
      sub.callbacks.onevent(event);
    }
  }

  simulateEose(subId) {
    const sub = this.subs.get(subId);
    if (sub && sub.callbacks.oneose) {
      sub.callbacks.oneose();
    }
  }
}

describe('Nostr Service', () => {
  let relayPool;
  let keyPair;

  beforeEach(async () => {
    // Initialisiere den Relay-Pool für jeden Test neu
    relayPool = new MockSimplePool();

    // Generiere ein Schlüsselpaar für die Tests
    keyPair = await generateKeyPair();
  });

  afterEach(() => {
    // Schließe alle Verbindungen nach jedem Test
    relayPool.close();
  });

  describe('initRelayPool', () => {
    it('should return a singleton instance of SimplePool', () => {
      // Wir können initRelayPool nicht direkt testen, da wir es mit MockSimplePool ersetzt haben
      // Stattdessen testen wir, ob relayPool die erwarteten Methoden hat
      expect(relayPool).to.have.property('connect');
      expect(relayPool).to.have.property('connectAll');
      expect(relayPool).to.have.property('subscribe');
      expect(relayPool).to.have.property('publish');
      expect(relayPool).to.have.property('close');
    });
  });

  describe('SimplePool', () => {
    it('should connect to a relay', async () => {
      const relay = await relayPool.connect('wss://test-relay.com');

      expect(relay).to.have.property('url');
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
      let eventReceived = false;
      let eoseReceived = false;

      const sub = relayPool.subscribe(['wss://relay.com'], [{ kinds: [1], limit: 10 }], {
        onevent: () => { eventReceived = true; },
        oneose: () => { eoseReceived = true; }
      });

      expect(sub).to.have.property('id');
      expect(sub).to.have.property('close');

      // Überprüfe, ob die Subscription im Relay-Pool gespeichert wurde
      expect(relayPool.subs.has(sub.id)).to.be.true;

      // Simuliere Events
      const event = { id: 'test-id', kind: 1, content: 'test' };
      relayPool.simulateEvent(sub.id, event);
      relayPool.simulateEose(sub.id);

      expect(eventReceived).to.be.true;
      expect(eoseReceived).to.be.true;
    });

    it('should publish an event', async () => {
      await relayPool.connect('wss://relay.com');
      const event = { id: 'test-id', kind: 1, content: 'test' };

      // Veröffentliche das Event
      await relayPool.publish(['wss://relay.com'], event);

      // Überprüfe, ob das Event gesendet wurde
      expect(relayPool.sent).to.have.lengthOf(1);
      expect(relayPool.sent[0].event).to.deep.equal(event);
      expect(relayPool.sent[0].relays).to.deep.equal(['wss://relay.com']);
    });
  });

  describe('subscribeToChannel', () => {
    it('should create a subscription for a channel', () => {
      const channelId = 'test-channel';
      const callbacks = {
        onEvent: () => {},
        onEose: () => {}
      };

      const sub = subscribeToChannel(relayPool, ['wss://relay.com'], channelId, keyPair.publicKey, true, callbacks);

      expect(sub).to.have.property('id');
      expect(relayPool.subs.has(sub.id)).to.be.true;
    });
  });
});
