import { expect } from '@esm-bundle/chai';
import { createOrFindChannel, createChannel } from '../src/services/channel-service.js';
import { getPublicKey } from '../src/services/crypto-service.js';
import { EVENT_TYPES } from '../src/utils/constants.js';
import { SimplePool } from 'nostr-tools';

// Verwende einen festen, bekannten privaten Schlüssel für Tests
const TEST_PRIVATE_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
// Leite den öffentlichen Schlüssel ab
const TEST_PUBLIC_KEY = getPublicKey(TEST_PRIVATE_KEY);

describe('Channel Creation Tests', () => {
  const testChannelId = 'nostr-chat-component-test-id';
  let pool;

  beforeEach(() => {
    pool = new SimplePool();
    console.log('Test using public key:', TEST_PUBLIC_KEY);
  });

  afterEach(() => {
    // Schließe alle Verbindungen
    pool.close([]);
  });

  it('should create a channel with correct properties', async () => {
    // Erstelle einen Kanal
    const channelEvent = await createChannel(
      pool,
      ['wss://relay.damus.io'],
      testChannelId,
      TEST_PUBLIC_KEY,
      TEST_PRIVATE_KEY
    );

    expect(channelEvent).to.exist;
    expect(channelEvent.kind).to.equal(EVENT_TYPES.CHANNEL_CREATE);
    expect(channelEvent.pubkey).to.equal(TEST_PUBLIC_KEY);

    // Überprüfe, ob das d-Tag den richtigen Wert hat
    const dTag = channelEvent.tags.find(tag => tag[0] === 'd');
    expect(dTag).to.exist;
    expect(dTag[1]).to.equal(testChannelId);
  });

  it('should create a channel with createOrFindChannel if none exists', async () => {
    // Verwende createOrFindChannel, um einen Kanal zu erstellen
    const channelEvent = await createOrFindChannel(
      pool,
      ['wss://relay.damus.io'],
      testChannelId + '-new',
      TEST_PUBLIC_KEY,
      TEST_PRIVATE_KEY
    );

    expect(channelEvent).to.exist;
    expect(channelEvent.kind).to.equal(EVENT_TYPES.CHANNEL_CREATE);
    expect(channelEvent.pubkey).to.equal(TEST_PUBLIC_KEY);

    // Überprüfe, ob das d-Tag den richtigen Wert hat
    const dTag = channelEvent.tags.find(tag => tag[0] === 'd');
    expect(dTag).to.exist;
    expect(dTag[1]).to.equal(testChannelId + '-new');
  });

  // Dieser Test ist eher ein Integrationstest und könnte in einer realen Umgebung fehlschlagen
  it('should be able to create and then find a channel', async function() {
    this.timeout(10000); // Erhöhe das Timeout für diesen Test

    // Erstelle einen eindeutigen Kanal-ID für diesen Test
    const uniqueChannelId = testChannelId + '-' + Date.now();

    // Erstelle zuerst einen Kanal
    const createdEvent = await createChannel(
      pool,
      ['wss://relay.damus.io'],
      uniqueChannelId,
      TEST_PUBLIC_KEY,
      TEST_PRIVATE_KEY
    );

    expect(createdEvent).to.exist;
    expect(createdEvent.kind).to.equal(EVENT_TYPES.CHANNEL_CREATE);

    // Warte einen Moment, damit der Relay das Event verarbeiten kann
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Versuche dann, den Kanal zu finden oder zu erstellen
    const foundEvent = await createOrFindChannel(
      pool,
      ['wss://relay.damus.io'],
      uniqueChannelId,
      TEST_PUBLIC_KEY,
      TEST_PRIVATE_KEY
    );

    // Überprüfe, ob das gefundene Event existiert und die richtigen Eigenschaften hat
    expect(foundEvent).to.exist;
    expect(foundEvent.kind).to.equal(EVENT_TYPES.CHANNEL_CREATE);

    // Überprüfe, ob das d-Tag den richtigen Wert hat
    const dTag = foundEvent.tags.find(tag => tag[0] === 'd');
    expect(dTag).to.exist;
    expect(dTag[1]).to.equal(uniqueChannelId);
  });
});
