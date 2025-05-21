/**
 * Hauptkomponente für den Nostr-Chat
 */
import { LitElement, html } from 'lit';
import { allStyles } from '../styles/shared-styles.js';
import { DEFAULT_RELAYS, DEFAULT_SETTINGS } from '../utils/constants.js';
import { generateKeyPair, getPublicKey } from '../services/crypto-service.js';
import { initRelayPool, createOrFindChannel, subscribeToChannel, sendMessage } from '../services/nostr-service.js';
import './message-list.js';
import './input-area.js';

export class NostrChat extends LitElement {
  static properties = {
    relay: { type: String, reflect: true },
    channel: { type: String, reflect: true },
    theme: { type: String, reflect: true },
    showAvatars: { type: Boolean, attribute: 'show-avatars', reflect: true },
    maxMessages: { type: Number, attribute: 'max-messages', reflect: true },
    privateKey: { type: String, attribute: 'private-key' },
    
    // Interne Properties
    messages: { type: Array, state: true },
    connected: { type: Boolean, state: true },
    loading: { type: Boolean, state: true },
    error: { type: String, state: true },
    userPublicKey: { type: String, state: true },
    relayPool: { type: Object, state: true },
    relays: { type: Array, state: true },
    subscription: { type: Object, state: true },
    processedEvents: { type: Set, state: true }
  };

  static styles = allStyles;

  constructor() {
    super();
    // Setze Standardwerte
    this.relay = DEFAULT_SETTINGS.relay;
    this.channel = DEFAULT_SETTINGS.channel;
    this.theme = DEFAULT_SETTINGS.theme;
    this.showAvatars = DEFAULT_SETTINGS.showAvatars;
    this.maxMessages = DEFAULT_SETTINGS.maxMessages;
    this.privateKey = '';
    
    // Interne Zustände
    this.messages = [];
    this.connected = false;
    this.loading = true;
    this.error = '';
    this.userPublicKey = '';
    this.relayPool = null;
    this.relays = [];
    this.subscription = null;
    this.processedEvents = new Set();
  }

  connectedCallback() {
    super.connectedCallback();
    this._initNostr();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cleanup();
  }

  updated(changedProperties) {
    if (changedProperties.has('relay') || changedProperties.has('channel')) {
      this._reconnect();
    }
    
    if (changedProperties.has('privateKey') && this.privateKey) {
      this._initWithPrivateKey();
    }
  }

  async _initNostr() {
    try {
      this.loading = true;
      
      // Initialisiere den Relay-Pool
      this.relayPool = initRelayPool();
      
      // Setze die Relays
      this.relays = [this.relay, ...DEFAULT_RELAYS.filter(r => r !== this.relay)];
      
      // Prüfe, ob ein privater Schlüssel übergeben wurde
      if (this.privateKey) {
        await this._initWithPrivateKey();
      } else {
        await this._initWithNewKey();
      }
      
      // Verbinde mit dem Kanal
      await this._connectToChannel();
      
      this.loading = false;
    } catch (error) {
      console.error('Error initializing Nostr:', error);
      this.error = `Error initializing Nostr: ${error.message}`;
      this.loading = false;
    }
  }

  async _initWithPrivateKey() {
    try {
      // Leite den öffentlichen Schlüssel aus dem privaten Schlüssel ab
      this.userPublicKey = await getPublicKey(this.privateKey);
      console.log('Initialized with provided private key, public key:', this.userPublicKey);
    } catch (error) {
      console.error('Error initializing with private key:', error);
      this.error = `Error initializing with private key: ${error.message}`;
      // Fallback auf einen neuen Schlüssel
      await this._initWithNewKey();
    }
  }

  async _initWithNewKey() {
    try {
      // Generiere ein neues Schlüsselpaar
      const { privateKey, publicKey } = await generateKeyPair();
      this.privateKey = privateKey;
      this.userPublicKey = publicKey;
      console.log('Generated new key pair, public key:', this.userPublicKey);
    } catch (error) {
      console.error('Error generating key pair:', error);
      this.error = `Error generating key pair: ${error.message}`;
    }
  }

  async _connectToChannel() {
    try {
      // Erstelle oder finde den Kanal
      await createOrFindChannel(
        this.relayPool,
        this.relays,
        this.channel,
        this.userPublicKey,
        this.privateKey
      );
      
      // Abonniere den Kanal
      this._subscribeToChannel();
      
      this.connected = true;
    } catch (error) {
      console.error('Error connecting to channel:', error);
      this.error = `Error connecting to channel: ${error.message}`;
      this.connected = false;
    }
  }

  _subscribeToChannel() {
    // Beende bestehende Subscription
    if (this.subscription) {
      this.subscription.unsub();
    }
    
    // Abonniere den Kanal
    this.subscription = subscribeToChannel(
      this.relayPool,
      this.relays,
      this.channel,
      this.userPublicKey,
      true
    );
    
    // Event-Handler für neue Events
    this.subscription.on('event', (event) => {
      this._processEvent(event);
    });
    
    // Event-Handler für das Ende der Subscription
    this.subscription.on('eose', () => {
      console.log('End of stored events');
      
      // Füge eine Willkommensnachricht hinzu, wenn keine Nachrichten vorhanden sind
      if (this.messages.length === 0) {
        this._addWelcomeMessage();
      }
      
      this.loading = false;
    });
  }

  _processEvent(event) {
    // Prüfe, ob das Event bereits verarbeitet wurde
    if (this.processedEvents.has(event.id)) {
      return;
    }
    
    // Füge das Event zur Liste der verarbeiteten Events hinzu
    this.processedEvents.add(event.id);
    
    // Füge das Event zur Nachrichtenliste hinzu
    this._addMessage(event);
  }

  _addMessage(event) {
    // Füge die Nachricht zur Liste hinzu
    this.messages = [...this.messages, event].sort((a, b) => a.created_at - b.created_at);
    
    // Begrenze die Anzahl der Nachrichten
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(this.messages.length - this.maxMessages);
    }
  }

  _addWelcomeMessage() {
    // Erstelle ein Willkommens-Event
    const welcomeEvent = {
      id: 'welcome-' + Date.now(),
      pubkey: 'system',
      created_at: Math.floor(Date.now() / 1000),
      content: 'Willkommen im Nostr-Chat! Sie können jetzt Nachrichten senden und empfangen.',
      tags: [['e', this.channel, '', 'root']],
      kind: 42,
      isSystemMessage: true
    };
    
    // Füge die Willkommensnachricht hinzu
    this._addMessage(welcomeEvent);
  }

  async _handleMessageSend(e) {
    try {
      const content = e.detail.message;
      
      // Sende die Nachricht
      await sendMessage(
        content,
        this.userPublicKey,
        this.privateKey,
        this.channel,
        this.relayPool,
        this.relays
      );
    } catch (error) {
      console.error('Error sending message:', error);
      this.error = `Error sending message: ${error.message}`;
    }
  }

  _reconnect() {
    this.loading = true;
    this.messages = [];
    this.processedEvents.clear();
    this._connectToChannel();
  }

  _cleanup() {
    // Beende bestehende Subscription
    if (this.subscription) {
      this.subscription.unsub();
    }
  }

  render() {
    return html`
      <div class="nostr-chat-container">
        <message-list
          .messages=${this.messages}
          current-user-pubkey=${this.userPublicKey}
          .relayPool=${this.relayPool}
          .relays=${this.relays}
          ?show-avatars=${this.showAvatars}
          ?loading=${this.loading}>
        </message-list>
        
        <input-area
          placeholder="Nachricht eingeben..."
          ?disabled=${!this.connected || this.loading}
          @message-send=${this._handleMessageSend}>
        </input-area>
        
        ${this.error ? html`<div class="error-message">${this.error}</div>` : ''}
      </div>
    `;
  }
}

customElements.define('nostr-chat', NostrChat);
