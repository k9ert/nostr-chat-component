/**
 * Komponente für den Eingabebereich
 */
import { LitElement, html } from 'lit';
import { inputAreaStyles } from '../styles/shared-styles.js';

export class InputArea extends LitElement {
  static properties = {
    placeholder: { type: String },
    disabled: { type: Boolean },
    value: { type: String, state: true }
  };

  static styles = [inputAreaStyles];

  constructor() {
    super();
    this.placeholder = 'Nachricht eingeben...';
    this.disabled = false;
    this.value = '';
  }

  _handleInput(e) {
    this.value = e.target.value;
  }

  _handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this._sendMessage();
    }
  }

  _sendMessage() {
    if (!this.value.trim() || this.disabled) return;
    
    const event = new CustomEvent('message-send', {
      detail: {
        message: this.value
      },
      bubbles: true,
      composed: true
    });
    
    this.dispatchEvent(event);
    this.value = '';
  }

  render() {
    return html`
      <div class="input-area">
        <textarea
          class="message-input"
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          .value=${this.value}
          @input=${this._handleInput}
          @keydown=${this._handleKeyDown}
        ></textarea>
        <button
          class="send-button"
          ?disabled=${!this.value.trim() || this.disabled}
          @click=${this._sendMessage}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    `;
  }
}

customElements.define('input-area', InputArea);
