import { html, fixture, expect } from '@open-wc/testing';
import '../src/components/message-item.js';

describe('MessageItem', () => {
  const mockMessage = {
    id: 'test-id',
    pubkey: 'test-pubkey',
    created_at: Math.floor(Date.now() / 1000),
    content: 'Test message',
    tags: []
  };

  const mockSystemMessage = {
    id: 'system-id',
    pubkey: 'system',
    created_at: Math.floor(Date.now() / 1000),
    content: 'System message',
    tags: [],
    isSystemMessage: true
  };

  it('renders a regular message correctly', async () => {
    const el = await fixture(html`
      <message-item
        .message=${mockMessage}
        current-user-pubkey="other-pubkey"
        .relayPool=${null}
        .relays=${[]}
        ?show-avatars=${true}>
      </message-item>
    `);

    // Überprüfe, ob die Komponente korrekt gerendert wurde
    expect(el.shadowRoot).to.exist;
    const messageElement = el.shadowRoot.querySelector('.chat-message');
    expect(messageElement).to.exist;
    expect(messageElement.classList.contains('others')).to.be.true;
    expect(messageElement.querySelector('.message-text').textContent).to.equal('Test message');
  });

  it('renders a system message correctly', async () => {
    const el = await fixture(html`
      <message-item
        .message=${mockSystemMessage}
        current-user-pubkey="test-pubkey"
        .relayPool=${null}
        .relays=${[]}
        ?show-avatars=${true}>
      </message-item>
    `);

    // Überprüfe, ob die Komponente korrekt gerendert wurde
    expect(el.shadowRoot).to.exist;
    const messageElement = el.shadowRoot.querySelector('.chat-message');
    expect(messageElement).to.exist;
    expect(messageElement.classList.contains('system-message')).to.be.true;
    expect(messageElement.querySelector('.message-text').textContent).to.equal('System message');
  });

  it('renders a self message correctly', async () => {
    const el = await fixture(html`
      <message-item
        .message=${mockMessage}
        current-user-pubkey="test-pubkey"
        .relayPool=${null}
        .relays=${[]}
        ?show-avatars=${true}>
      </message-item>
    `);

    // Überprüfe, ob die Komponente korrekt gerendert wurde
    expect(el.shadowRoot).to.exist;
    const messageElement = el.shadowRoot.querySelector('.chat-message');
    expect(messageElement).to.exist;
    expect(messageElement.classList.contains('self')).to.be.true;
    expect(messageElement.querySelector('.message-text').textContent).to.equal('Test message');
  });

  it('respects the showAvatars property', async () => {
    // Mit Avataren
    const elWithAvatars = await fixture(html`
      <message-item
        .message=${mockMessage}
        current-user-pubkey="other-pubkey"
        .relayPool=${null}
        .relays=${[]}
        show-avatars>
      </message-item>
    `);

    expect(elWithAvatars.shadowRoot.querySelector('.avatar-container')).to.exist;

    // Ohne Avatare
    const elWithoutAvatars = await fixture(html`
      <message-item
        .message=${mockMessage}
        current-user-pubkey="other-pubkey"
        .relayPool=${null}
        .relays=${[]}
        .showAvatars=${false}>
      </message-item>
    `);

    // Überprüfe, ob die Komponente die showAvatars-Eigenschaft korrekt gesetzt hat
    expect(elWithoutAvatars.showAvatars).to.be.false;
  });
});
