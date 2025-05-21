import { html, fixture, expect, oneEvent } from '@open-wc/testing';
import '../src/components/input-area.js';

describe('InputArea', () => {
  it('renders with default properties', async () => {
    const el = await fixture(html`<input-area></input-area>`);

    // Überprüfe, ob die Komponente korrekt gerendert wurde
    expect(el.shadowRoot).to.exist;
    expect(el.shadowRoot.querySelector('.input-area')).to.exist;
    expect(el.shadowRoot.querySelector('.message-input')).to.exist;
    expect(el.shadowRoot.querySelector('.send-button')).to.exist;
  });

  it('updates value when input changes', async () => {
    const el = await fixture(html`<input-area></input-area>`);
    const input = el.shadowRoot.querySelector('.message-input');

    // Simuliere eine Eingabe
    input.value = 'Test message';
    input.dispatchEvent(new Event('input'));

    // Überprüfe, ob der Wert aktualisiert wurde
    expect(el.value).to.equal('Test message');
  });

  it('disables the send button when the input is empty', async () => {
    const el = await fixture(html`<input-area></input-area>`);
    const button = el.shadowRoot.querySelector('.send-button');

    // Überprüfe, ob der Button deaktiviert ist, wenn das Eingabefeld leer ist
    expect(button.hasAttribute('disabled')).to.be.true;

    // Simuliere eine Eingabe
    const input = el.shadowRoot.querySelector('.message-input');
    input.value = 'Test message';
    input.dispatchEvent(new Event('input'));

    // Warte auf die Aktualisierung der Komponente
    await el.updateComplete;

    // Überprüfe, ob der Button aktiviert ist, wenn das Eingabefeld nicht leer ist
    expect(button.hasAttribute('disabled')).to.be.false;
  });

  it('disables the input and button when the disabled property is set', async () => {
    const el = await fixture(html`<input-area disabled></input-area>`);
    const input = el.shadowRoot.querySelector('.message-input');
    const button = el.shadowRoot.querySelector('.send-button');

    // Überprüfe, ob das Eingabefeld und der Button deaktiviert sind
    expect(input.disabled).to.be.true;
    expect(button.disabled).to.be.true;
  });

  it('dispatches a message-send event when the send button is clicked', async () => {
    const el = await fixture(html`<input-area></input-area>`);
    const input = el.shadowRoot.querySelector('.message-input');
    const button = el.shadowRoot.querySelector('.send-button');

    // Simuliere eine Eingabe
    input.value = 'Test message';
    input.dispatchEvent(new Event('input'));

    // Warte auf das message-send-Event
    setTimeout(() => button.click());
    const { detail } = await oneEvent(el, 'message-send');

    // Überprüfe, ob das Event korrekt ausgelöst wurde
    expect(detail).to.deep.equal({ message: 'Test message' });

    // Überprüfe, ob das Eingabefeld zurückgesetzt wurde
    expect(el.value).to.equal('');
  });

  it('dispatches a message-send event when Enter is pressed', async () => {
    const el = await fixture(html`<input-area></input-area>`);
    const input = el.shadowRoot.querySelector('.message-input');

    // Simuliere eine Eingabe
    input.value = 'Test message';
    input.dispatchEvent(new Event('input'));

    // Warte auf das message-send-Event
    setTimeout(() => {
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true
      });
      input.dispatchEvent(enterEvent);
    });
    const { detail } = await oneEvent(el, 'message-send');

    // Überprüfe, ob das Event korrekt ausgelöst wurde
    expect(detail).to.deep.equal({ message: 'Test message' });

    // Überprüfe, ob das Eingabefeld zurückgesetzt wurde
    expect(el.value).to.equal('');
  });
});
