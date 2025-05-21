/**
 * Komponente für ein einzelnes Nachrichtenelement
 */
import { LitElement, html } from 'lit';
import { messageItemStyles } from '../styles/shared-styles.js';
import { formatTimestamp, processMessageContent } from '../utils/helpers.js';
import { getDisplayName, getProfilePicture, loadProfileInfo } from '../services/profile-service.js';

export class MessageItem extends LitElement {
  static properties = {
    message: { type: Object },
    currentUserPubkey: { type: String, attribute: 'current-user-pubkey' },
    relayPool: { type: Object },
    relays: { type: Array },
    showAvatars: { type: Boolean, attribute: 'show-avatars' }
  };

  static styles = [messageItemStyles];

  constructor() {
    super();
    this.message = null;
    this.currentUserPubkey = '';
    this.relayPool = null;
    this.relays = [];
    this.showAvatars = true;
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.message && this.relayPool && this.relays.length > 0) {
      this._loadProfileInfo();
    }
  }

  updated(changedProperties) {
    if (
      (changedProperties.has('message') ||
       changedProperties.has('relayPool') ||
       changedProperties.has('relays')) &&
      this.message &&
      this.relayPool &&
      this.relays.length > 0
    ) {
      this._loadProfileInfo();
    }
  }

  _loadProfileInfo() {
    loadProfileInfo(this.message.pubkey, this.relayPool, this.relays, (profile) => {
      if (profile) {
        this.requestUpdate();
      }
    });
  }

  _getMessageClasses() {
    const classes = ['chat-message'];

    if (this.message.isSystemMessage || this.message.pubkey === 'system') {
      classes.push('system-message');
    } else if (this.message.pubkey === this.currentUserPubkey) {
      classes.push('self');
    } else {
      classes.push('others');
    }

    return classes.join(' ');
  }

  _renderAvatar() {
    if (!this.showAvatars) return '';

    const isSystemMessage = this.message.isSystemMessage || this.message.pubkey === 'system';
    if (isSystemMessage) return '';

    const profilePicture = getProfilePicture(this.message);
    const displayName = getDisplayName(this.message);
    const initial = displayName.charAt(0).toUpperCase();

    return html`
      <div class="avatar-container">
        <div class="avatar">
          ${profilePicture
            ? html`<img class="avatar-img" src="${profilePicture}" alt="${displayName}" @error=${this._handleAvatarError}>`
            : html`${initial}`}
        </div>
      </div>
    `;
  }

  _handleAvatarError(e) {
    const displayName = getDisplayName(this.message);
    const initial = displayName.charAt(0).toUpperCase();
    e.target.replaceWith(document.createTextNode(initial));
  }

  render() {
    if (!this.message) return html``;

    const isSystemMessage = this.message.isSystemMessage || this.message.pubkey === 'system';
    const displayName = getDisplayName(this.message);
    const timestamp = formatTimestamp(this.message.created_at);
    const content = isSystemMessage
      ? this.message.content
      : processMessageContent(this.message.content);

    return html`
      <div class=${this._getMessageClasses()} data-event-id=${this.message.id} data-pubkey=${this.message.pubkey}>
        ${isSystemMessage
          ? html`
            <div class="message-content">
              <div class="message-text">${content}</div>
            </div>
          `
          : html`
            <div class="message-container">
              ${this._renderAvatar()}
              <div class="content-container">
                <div class="message-header">
                  <span class="username">${displayName}</span>
                  <span class="timestamp">${timestamp}</span>
                </div>
                <div class="message-content">
                  <div class="message-text">${content}</div>
                </div>
                <div class="message-reactions"></div>
              </div>
            </div>
          `}
      </div>
    `;
  }
}

customElements.define('message-item', MessageItem);
