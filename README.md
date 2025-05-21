# Nostr Chat Component

Eine wiederverwendbare Chat-Komponente für Nostr, die mit Web Components (Lit) gebaut wurde.

## Features

- Einfache Integration in jede Webseite
- Unterstützung für verschiedene Nostr-Relays
- Anpassbare Darstellung
- Unterstützung für Profilbilder und Reaktionen
- Keine Server-Komponenten erforderlich

## Installation

### Via NPM

```bash
npm install nostr-chat-component
```

### Via CDN

```html
<script type="module" src="https://unpkg.com/nostr-chat-component@latest/dist/nostr-chat.min.js"></script>
```

## Verwendung

Einfach die Komponente in Ihre HTML-Seite einbinden:

```html
<!-- Einbinden der Komponente -->
<script type="module" src="path/to/nostr-chat.js"></script>

<!-- Verwendung mit minimaler Konfiguration -->
<nostr-chat 
  relay="wss://relay.damus.io" 
  channel="ottobrunner-hofflohmarkt-2025">
</nostr-chat>
```

### Konfigurationsoptionen

| Attribut | Beschreibung | Standard |
|----------|--------------|----------|
| `relay` | URL des Nostr-Relays | `wss://relay.damus.io` |
| `channel` | Kanal-ID | `default-channel` |
| `theme` | Farbschema (`light` oder `dark`) | `light` |
| `show-avatars` | Profilbilder anzeigen | `true` |
| `max-messages` | Maximale Anzahl anzuzeigender Nachrichten | `50` |

## Entwicklung

### Voraussetzungen

- Node.js (v14 oder höher)
- npm oder yarn

### Setup

```bash
# Repository klonen
git clone https://github.com/yourusername/nostr-chat-component.git
cd nostr-chat-component

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm start
```

### Befehle

- `npm start` - Startet den Entwicklungsserver
- `npm run build` - Erstellt die Produktionsversion
- `npm test` - Führt Tests aus
- `npm run lint` - Prüft den Code auf Fehler

## Lizenz

MIT
