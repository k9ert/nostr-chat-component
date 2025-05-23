/**
 * Gemeinsame Styles für die Nostr-Chat-Komponente
 */
import { css } from 'lit';

// Basis-Styles
export const baseStyles = css`
  :host {
    display: block;
    font-family: var(--nostr-chat-font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
    color: var(--nostr-chat-text-color, #333);
    --primary-color: var(--nostr-chat-primary-color, #3498db);
    --secondary-color: var(--nostr-chat-secondary-color, #2c7873);
    --background-color: var(--nostr-chat-background-color, #f9f9f9);
    --border-color: var(--nostr-chat-border-color, #ddd);
    --success-color: var(--nostr-chat-success-color, #27ae60);
    --error-color: var(--nostr-chat-error-color, #e74c3c);
    --self-message-bg: var(--nostr-chat-self-message-bg, #2c7873);
    --self-message-color: var(--nostr-chat-self-message-color, white);
    --others-message-bg: var(--nostr-chat-others-message-bg, white);
    --others-message-color: var(--nostr-chat-others-message-color, #333);
    --system-message-bg: var(--nostr-chat-system-message-bg, #f8f9fa);
    --system-message-color: var(--nostr-chat-system-message-color, #495057);
    --avatar-bg: var(--nostr-chat-avatar-bg, #3498db);
    --avatar-color: var(--nostr-chat-avatar-color, white);
    --input-bg: var(--nostr-chat-input-bg, white);
    --input-color: var(--nostr-chat-input-color, #333);
    --button-bg: var(--nostr-chat-button-bg, #3498db);
    --button-color: var(--nostr-chat-button-color, white);
    --link-color: var(--nostr-chat-link-color, #3498db);
    --timestamp-color: var(--nostr-chat-timestamp-color, #999);
    --username-color: var(--nostr-chat-username-color, #3498db);
    --border-radius: var(--nostr-chat-border-radius, 8px);
    --shadow: var(--nostr-chat-shadow, 0 1px 3px rgba(0, 0, 0, 0.1));
    --transition: var(--nostr-chat-transition, all 0.3s ease);
  }

  :host([theme="dark"]) {
    --primary-color: var(--nostr-chat-primary-color-dark, #3498db);
    --secondary-color: var(--nostr-chat-secondary-color-dark, #2c7873);
    --background-color: var(--nostr-chat-background-color-dark, #1a1a1a);
    --border-color: var(--nostr-chat-border-color-dark, #444);
    --text-color: var(--nostr-chat-text-color-dark, #f0f0f0);
    --self-message-bg: var(--nostr-chat-self-message-bg-dark, #2c7873);
    --self-message-color: var(--nostr-chat-self-message-color-dark, white);
    --others-message-bg: var(--nostr-chat-others-message-bg-dark, #2a2a2a);
    --others-message-color: var(--nostr-chat-others-message-color-dark, #f0f0f0);
    --system-message-bg: var(--nostr-chat-system-message-bg-dark, #2a2a2a);
    --system-message-color: var(--nostr-chat-system-message-color-dark, #aaa);
    --input-bg: var(--nostr-chat-input-bg-dark, #2a2a2a);
    --input-color: var(--nostr-chat-input-color-dark, #f0f0f0);
    --button-bg: var(--nostr-chat-button-bg-dark, #3498db);
    --button-color: var(--nostr-chat-button-color-dark, white);
    --link-color: var(--nostr-chat-link-color-dark, #3498db);
    --timestamp-color: var(--nostr-chat-timestamp-color-dark, #aaa);
    --username-color: var(--nostr-chat-username-color-dark, #3498db);
  }
`;

// Chat-Container-Styles
export const chatContainerStyles = css`
  :host {
    display: block;
    height: 100%;
  }

  .nostr-chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--background-color);
    border-radius: var(--border-radius);
    overflow: hidden;
  }
`;

// Nachrichtenlisten-Styles
export const messageListStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0; /* Wichtig für Flexbox-Scrolling */
    overflow: hidden;
  }

  .message-list {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    height: 100%;
    position: relative;
  }

  .message-list::-webkit-scrollbar {
    width: 6px;
  }

  .message-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .message-list::-webkit-scrollbar-thumb {
    background-color: var(--border-color);
    border-radius: 3px;
  }

  .loading-indicator {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.7);
    z-index: 10;
  }
`;

// Nachrichtenelemente-Styles
export const messageItemStyles = css`
  .chat-message {
    padding: 12px;
    border-radius: var(--border-radius);
    max-width: 80%;
    word-wrap: break-word;
    margin-bottom: 10px;
    box-shadow: var(--shadow);
    transition: var(--transition);
  }

  .chat-message.self {
    align-self: flex-end;
    background-color: var(--self-message-bg);
    color: var(--self-message-color);
    margin-left: auto;
  }

  .chat-message.others {
    align-self: flex-start;
    background-color: var(--others-message-bg);
    color: var(--others-message-color);
    margin-right: auto;
    border-left: 3px solid var(--primary-color);
  }

  .chat-message.system-message {
    background-color: var(--system-message-bg);
    color: var(--system-message-color);
    border-left: 4px solid #6c757d;
    font-style: italic;
    max-width: 90%;
    margin-left: auto;
    margin-right: auto;
    text-align: center;
  }

  .message-container {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    width: 100%;
  }

  .chat-message.self .message-container {
    flex-direction: row-reverse;
  }

  .avatar-container {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: bold;
    color: var(--avatar-color);
    background-color: var(--avatar-bg);
    overflow: hidden;
  }

  .avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  .content-container {
    flex: 1;
    min-width: 0;
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9em;
    margin-bottom: 8px;
  }

  .chat-message.self .message-header {
    flex-direction: row-reverse;
  }

  .username {
    font-weight: bold;
    color: var(--username-color);
  }

  .chat-message.self .username {
    color: var(--self-message-color);
    opacity: 0.9;
  }

  .timestamp {
    color: var(--timestamp-color);
    font-size: 0.8em;
  }

  .chat-message.self .timestamp {
    color: var(--self-message-color);
    opacity: 0.8;
  }

  .message-content {
    line-height: 1.5;
  }

  .message-text {
    margin-top: 5px;
  }

  .message-image {
    max-width: 100%;
    max-height: 300px;
    display: block;
    border-radius: var(--border-radius);
    margin-top: 10px;
  }

  .chat-message.self a {
    color: var(--self-message-color);
    opacity: 0.9;
    text-decoration: underline;
  }

  .chat-message a {
    color: var(--link-color);
    text-decoration: none;
  }

  .chat-message a:hover {
    text-decoration: underline;
  }

  .message-reactions {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 8px;
  }

  .reaction {
    display: inline-flex;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 12px;
    padding: 3px 8px;
    font-size: 0.9em;
    cursor: pointer;
  }

  .chat-message.self .reaction {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .reaction-count {
    margin-left: 4px;
    font-size: 0.8em;
    opacity: 0.8;
  }
`;

// Eingabebereich-Styles
export const inputAreaStyles = css`
  :host {
    display: block;
    flex-shrink: 0; /* Verhindert, dass der Eingabebereich schrumpft */
  }

  .input-area {
    display: flex;
    padding: 0.75rem;
    background-color: rgba(0, 0, 0, 0.03);
    border-top: 1px solid var(--border-color);
  }

  .message-input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    font-family: inherit;
    font-size: 1rem;
    background-color: var(--input-bg);
    color: var(--input-color);
    resize: none;
    min-height: 40px;
    max-height: 120px;
    transition: var(--transition);
  }

  .message-input:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .send-button {
    margin-left: 0.5rem;
    padding: 0 1rem;
    background-color: var(--button-bg);
    color: var(--button-color);
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
    font-weight: 500;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .send-button:hover {
    background-color: var(--primary-color);
    opacity: 0.9;
  }

  .send-button:disabled {
    background-color: var(--border-color);
    cursor: not-allowed;
  }

  .send-button svg {
    width: 20px;
    height: 20px;
  }
`;

// Lade-Indikator-Styles
export const loadingIndicatorStyles = css`
  /* Lade-Indikator-Styles wurden in messageListStyles verschoben */

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top-color: var(--primary-color);
    animation: spin 1s ease-in-out infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

// Kombiniere alle Styles
export const allStyles = [
  baseStyles,
  chatContainerStyles,
  messageListStyles,
  messageItemStyles,
  inputAreaStyles,
  loadingIndicatorStyles
];
