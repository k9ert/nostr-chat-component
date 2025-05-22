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
    processedEvents: { type: Set, state: true },
    channelEventId: { type: String, state: true } // Event-ID des Kanal-Erstellungsereignisses
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
    this.processedEvents = new Set();
    this.channelEventId = null; // Event-ID des Kanal-Erstellungsereignisses
  }

  connectedCallback() {
    super.connectedCallback();
    this._initNostr();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Keine Aufräumarbeiten mehr nötig, da wir keine Subscription-Referenz mehr speichern
  }

  updated(changedProperties) {
    console.log('[DEBUG] updated - changedProperties:', Array.from(changedProperties.keys()));

    // Wenn wir gerade in der Initialisierungsphase sind, ignoriere Änderungen
    if (this.loading) {
      console.log('[DEBUG] updated - Ignoring changes during loading');
      return;
    }

    // Wenn sich relay oder channel geändert haben, verbinde neu
    if (changedProperties.has('relay') || changedProperties.has('channel')) {
      console.log('[DEBUG] updated - Reconnecting due to relay or channel change');
      this._reconnect();
    }

    // Wenn sich privateKey geändert hat und nicht leer ist, initialisiere mit dem neuen Schlüssel
    if (changedProperties.has('privateKey') && this.privateKey) {
      console.log('[DEBUG] updated - Initializing with new private key');
      this._initWithPrivateKey();
    }
  }

  async _initNostr() {
    try {
      this.loading = true;
      console.log('[DEBUG] _initNostr - START');

      // Initialisiere den Relay-Pool
      this.relayPool = initRelayPool();
      console.log('[DEBUG] _initNostr - Relay pool initialized');

      // Setze die Relays
      this.relays = [this.relay, ...DEFAULT_RELAYS.filter(r => r !== this.relay)];
      console.log('[DEBUG] _initNostr - Relays set:', this.relays);

      // Prüfe, ob ein privater Schlüssel übergeben wurde
      console.log('[DEBUG] _initNostr - Checking privateKey:', this.privateKey);

      // Initialisiere den privaten Schlüssel VOLLSTÄNDIG, bevor wir weitermachen
      let keyInitialized = false;

      if (this.privateKey) {
        console.log('[DEBUG] _initNostr - Using provided privateKey');
        try {
          await this._initWithPrivateKey();
          keyInitialized = true;
        } catch (error) {
          console.error('[DEBUG] _initNostr - Error initializing with provided key:', error);
          // Wenn die Initialisierung mit dem bereitgestellten Schlüssel fehlschlägt,
          // versuchen wir es mit einem neuen Schlüssel
        }
      }

      if (!keyInitialized) {
        console.log('[DEBUG] _initNostr - Generating new key');
        await this._initWithNewKey();
      }

      console.log('[DEBUG] _initNostr - Key initialized, privateKey:', this.privateKey ? 'set' : 'not set');
      console.log('[DEBUG] _initNostr - userPublicKey:', this.userPublicKey);

      // Prüfe, ob der private Schlüssel jetzt gesetzt ist
      if (!this.privateKey) {
        throw new Error('Private key is still empty after initialization');
      }

      // Verbinde mit dem Kanal ERST NACHDEM der Schlüssel vollständig initialisiert ist
      console.log('[DEBUG] _initNostr - Connecting to channel');
      await this._connectToChannel();
      console.log('[DEBUG] _initNostr - Connected to channel');

      // Setze loading auf false ERST NACHDEM alles initialisiert ist
      console.log('[DEBUG] _initNostr - Initialization complete');
      this.loading = false;
    } catch (error) {
      console.error('Error initializing Nostr:', error);
      this.error = `Error initializing Nostr: ${error.message}`;
      this.loading = false;
    }
  }

  async _initWithPrivateKey() {
    try {
      // Fail fast: Prüfe sofort, ob der private Schlüssel leer ist
      if (!this.privateKey) {
        throw new Error('Private key is empty or undefined in _initWithPrivateKey');
      }

      // Stelle sicher, dass der private Schlüssel ein String ist
      const privateKeyStr = String(this.privateKey);
      console.log('[DEBUG] _initWithPrivateKey - privateKeyStr:', privateKeyStr);

      // Leite den öffentlichen Schlüssel aus dem privaten Schlüssel ab
      this.userPublicKey = getPublicKey(privateKeyStr);

      // Aktualisiere den privaten Schlüssel als String
      this.privateKey = privateKeyStr;

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

      // Fail fast: Prüfe sofort, ob der private Schlüssel leer ist
      if (!privateKey) {
        throw new Error('Generated private key is empty or undefined');
      }

      // Setze die Schlüssel
      this.privateKey = privateKey;
      this.userPublicKey = publicKey;

      console.log('Generated new key pair, public key:', this.userPublicKey);

      // Prüfe, ob der private Schlüssel korrekt gesetzt wurde
      if (!this.privateKey) {
        throw new Error('Private key is still empty after setting it');
      }
    } catch (error) {
      console.error('Error generating key pair:', error);
      this.error = `Error generating key pair: ${error.message}`;
      throw error; // Wichtig: Gib den Fehler weiter, damit _initNostr ihn fangen kann
    }
  }

  async _connectToChannel() {
    try {
      // Fail fast: Prüfe sofort, ob der private Schlüssel leer ist
      if (!this.privateKey) {
        throw new Error('Private key is empty or undefined in _connectToChannel');
      }

      // Stelle sicher, dass der private Schlüssel ein String ist
      const privateKeyStr = String(this.privateKey);
      console.log('[DEBUG] _connectToChannel - privateKeyStr:', privateKeyStr);

      // Erstelle oder finde den Kanal
      const channelEvent = await createOrFindChannel(
        this.relayPool,
        this.relays,
        this.channel,
        this.userPublicKey,
        privateKeyStr
      );

      // Speichere die Event-ID des Kanal-Erstellungsereignisses
      if (channelEvent && channelEvent.id) {
        this.channelEventId = channelEvent.id;
        console.log('[DEBUG] _connectToChannel - Channel event ID:', this.channelEventId);
      } else {
        console.warn('[DEBUG] _connectToChannel - No channel event ID found');
      }

      // Abonniere den Kanal direkt, ohne Referenz zu speichern
      subscribeToChannel(
        this.relayPool,
        this.relays,
        this.channel,
        this.userPublicKey,
        true,
        {
          onEvent: (event) => {
            console.log('[DEBUG] Channel event received:', event);

            // Prüfe, ob das Event ein e-Tag mit der richtigen Event-ID hat
            if (this.channelEventId) {
              const eTag = event.tags.find(tag => tag[0] === 'e');
              if (eTag && eTag[1] !== this.channelEventId) {
                console.log('[DEBUG] Event has wrong e-tag, skipping:', event);
                return;
              }
            }

            this._processEvent(event);
          },
          onEose: () => {
            console.log('[DEBUG] End of stored events');

            // Füge eine Willkommensnachricht hinzu, wenn keine Nachrichten vorhanden sind
            if (this.messages.length === 0) {
              console.log('[DEBUG] No messages, adding welcome message');
              this._addWelcomeMessage();
            } else {
              console.log('[DEBUG] Messages found:', this.messages.length);
            }

            this.loading = false;
            console.log('[DEBUG] Loading set to false');

            // Erzwinge ein Rendering-Update
            this.requestUpdate();
          }
        }
      );

      this.connected = true;
    } catch (error) {
      console.error('Error connecting to channel:', error);
      this.error = `Error connecting to channel: ${error.message}`;
      this.connected = false;
    }
  }



  _processEvent(event) {
    console.log('[DEBUG] _processEvent - Received event:', event);
    console.log('[DEBUG] _processEvent - Event content:', event.content);
    console.log('[DEBUG] _processEvent - Event kind:', event.kind);
    console.log('[DEBUG] _processEvent - Event pubkey:', event.pubkey);

    // Prüfe, ob das Event bereits verarbeitet wurde
    if (this.processedEvents.has(event.id)) {
      console.log('[DEBUG] _processEvent - Event already processed, skipping:', event.id);
      return;
    }

    // Füge das Event zur Liste der verarbeiteten Events hinzu
    this.processedEvents.add(event.id);
    console.log('[DEBUG] _processEvent - Added event to processed events, count:', this.processedEvents.size);

    // Füge das Event zur Nachrichtenliste hinzu
    this._addMessage(event);
    console.log('[DEBUG] _processEvent - Added message to list, count:', this.messages.length);
  }

  _addMessage(event) {
    console.log('[DEBUG] _addMessage - Adding message:', event);

    // Füge die Nachricht zur Liste hinzu
    const newMessages = [...this.messages, event].sort((a, b) => a.created_at - b.created_at);
    console.log('[DEBUG] _addMessage - New messages array length:', newMessages.length);

    // Begrenze die Anzahl der Nachrichten
    if (newMessages.length > this.maxMessages) {
      console.log('[DEBUG] _addMessage - Limiting messages to max:', this.maxMessages);
      this.messages = newMessages.slice(newMessages.length - this.maxMessages);
    } else {
      this.messages = newMessages;
    }

    console.log('[DEBUG] _addMessage - Final messages array:', this.messages);
    console.log('[DEBUG] _addMessage - Messages count:', this.messages.length);

    // Erzwinge ein Rendering-Update
    this.requestUpdate();
  }

  _addWelcomeMessage() {
    // Erstelle ein Willkommens-Event
    const welcomeEvent = {
      id: 'welcome-' + Date.now(),
      pubkey: 'system',
      created_at: Math.floor(Date.now() / 1000),
      content: 'Willkommen im Nostr-Chat! Sie können jetzt Nachrichten senden und empfangen.',
      tags: this.channelEventId ? [['e', this.channelEventId, '', 'root']] : [],
      kind: 42,
      isSystemMessage: true
    };

    // Füge die Willkommensnachricht hinzu
    this._addMessage(welcomeEvent);
  }

  async _handleMessageSend(e) {
    try {
      const content = e.detail.message;

      // Fail fast: Prüfe sofort, ob der private Schlüssel leer ist
      if (!this.privateKey) {
        throw new Error('Private key is empty or undefined in _handleMessageSend');
      }

      // Stelle sicher, dass der private Schlüssel ein String ist
      const privateKeyStr = String(this.privateKey);
      console.log('[DEBUG] _handleMessageSend - privateKeyStr:', privateKeyStr);

      // Sende die Nachricht
      await sendMessage(
        content,
        this.userPublicKey,
        privateKeyStr,
        this.channel,
        this.relayPool,
        this.relays,
        this.channelEventId // Übergebe die Event-ID des Kanal-Erstellungsereignisses
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

  // Keine _cleanup-Methode mehr nötig, da wir keine Subscription-Referenz mehr speichern

  render() {
    console.log('[DEBUG] render - messages:', this.messages);
    console.log('[DEBUG] render - connected:', this.connected);
    console.log('[DEBUG] render - loading:', this.loading);
    console.log('[DEBUG] render - error:', this.error);

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

        <!-- Debug-Ausgabe -->
        <div class="debug-info" style="font-size: 10px; color: #999; margin-top: 10px;">
          <p>Messages: ${this.messages.length}</p>
          <p>Connected: ${this.connected}</p>
          <p>Loading: ${this.loading}</p>
          <p>Public Key: ${this.userPublicKey}</p>
        </div>
      </div>
    `;
  }
}

customElements.define('nostr-chat', NostrChat);
