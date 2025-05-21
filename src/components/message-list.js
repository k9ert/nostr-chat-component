/**
 * Komponente für die Nachrichtenliste
 */
import { LitElement, html } from 'lit';
import { messageListStyles } from '../styles/shared-styles.js';
import './message-item.js';

export class MessageList extends LitElement {
  static properties = {
    messages: { type: Array },
    currentUserPubkey: { type: String, attribute: 'current-user-pubkey' },
    relayPool: { type: Object },
    relays: { type: Array },
    showAvatars: { type: Boolean, attribute: 'show-avatars' },
    loading: { type: Boolean }
  };

  static styles = [messageListStyles];

  constructor() {
    super();
    this.messages = [];
    this.currentUserPubkey = '';
    this.relayPool = null;
    this.relays = [];
    this.showAvatars = true;
    this.loading = false;
  }

  updated(changedProperties) {
    if (changedProperties.has('messages') && this.messages.length > 0) {
      this._scrollToBottom();
    }
  }

  _scrollToBottom() {
    const messageList = this.shadowRoot.querySelector('.message-list');
    if (messageList) {
      setTimeout(() => {
        messageList.scrollTop = messageList.scrollHeight;
      }, 0);
    }
  }

  render() {
    return html`
      <div class="message-list">
        ${this.loading 
          ? html`<div class="loading-indicator"><div class="spinner"></div></div>` 
          : ''}
        ${this.messages.map(message => html`
          <message-item 
            .message=${message}
            current-user-pubkey=${this.currentUserPubkey}
            .relayPool=${this.relayPool}
            .relays=${this.relays}
            ?show-avatars=${this.showAvatars}>
          </message-item>
        `)}
      </div>
    `;
  }
}

customElements.define('message-list', MessageList);
