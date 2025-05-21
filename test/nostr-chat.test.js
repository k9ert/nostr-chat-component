import { html, fixture, expect } from '@open-wc/testing';
import '../src/components/nostr-chat.js';

describe('NostrChat', () => {
  it('renders with default properties', async () => {
    const el = await fixture(html`<nostr-chat></nostr-chat>`);

    // Überprüfe, ob die Komponente korrekt gerendert wurde
    expect(el.shadowRoot).to.exist;
    expect(el.shadowRoot.querySelector('.nostr-chat-container')).to.exist;
    expect(el.shadowRoot.querySelector('message-list')).to.exist;
    expect(el.shadowRoot.querySelector('input-area')).to.exist;
  });

  it('initializes with a new key pair when no private key is provided', async () => {
    const el = await fixture(html`<nostr-chat></nostr-chat>`);

    // Überprüfe, ob ein neues Schlüsselpaar generiert wurde
    expect(el.privateKey).to.be.a('string');
    expect(el.userPublicKey).to.be.a('string');
  });

  it('uses the provided private key when one is provided', async () => {
    // Erstelle eine Komponente mit einem festen privaten Schlüssel
    const privateKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    // Erstelle eine neue Komponente mit dem festen privaten Schlüssel
    const el = await fixture(html`<nostr-chat private-key="${privateKey}"></nostr-chat>`);

    // Überprüfe, ob der private Schlüssel korrekt verwendet wurde
    expect(el.privateKey).to.equal(privateKey);
  });

  it('connects to the specified relay and channel', async () => {
    const relay = 'wss://relay.damus.io';
    const channel = 'test-channel';

    const el = await fixture(html`
      <nostr-chat
        relay="${relay}"
        channel="${channel}">
      </nostr-chat>
    `);

    // Überprüfe, ob die Komponente mit dem angegebenen Relay und Kanal konfiguriert ist
    expect(el.relay).to.equal(relay);
    expect(el.channel).to.equal(channel);
  });
});
