/**
 * Hilfsfunktionen für die Nostr-Chat-Komponente
 */

/**
 * Konvertiert einen Hex-String in ein Uint8Array
 * @param {string} hex - Hex-String
 * @returns {Uint8Array} - Uint8Array
 */
export function hexToBytes(hex) {
  if (!hex) {
    return new Uint8Array();
  }

  // Entferne 0x-Präfix, falls vorhanden
  const hexString = hex.startsWith('0x') ? hex.slice(2) : hex;

  // Stelle sicher, dass die Länge gerade ist
  const normalizedHex = hexString.length % 2 === 0 ? hexString : '0' + hexString;

  const bytes = new Uint8Array(normalizedHex.length / 2);

  for (let i = 0; i < normalizedHex.length; i += 2) {
    bytes[i / 2] = parseInt(normalizedHex.substr(i, 2), 16);
  }

  return bytes;
}

/**
 * Konvertiert ein Uint8Array in einen Hex-String
 * @param {Uint8Array} bytes - Uint8Array
 * @returns {string} - Hex-String
 */
export function bytesToHex(bytes) {
  if (!bytes) {
    return '';
  }

  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Formatiert einen Zeitstempel als lesbare Zeit
 * @param {number} timestamp - Unix-Zeitstempel in Sekunden
 * @returns {string} - Formatierte Zeit
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return '';

  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Prüft, ob eine URL ein Bild ist
 * @param {string} url - URL
 * @returns {boolean} - true, wenn die URL ein Bild ist
 */
export function isImageUrl(url) {
  console.log("entering isImageUrl with url:", url);
  try {
    // Grundlegende Validierung
    if (!url || typeof url !== 'string') {
      return false;
    }

    // Prüfe auf HTML-Tags für Bilder
    if (url.includes('<a href="') && url.includes('">')) {
      // Extrahiere die URL aus dem <a href> Tag
      const match = url.match(/<a href="([^"]+)"[^>]*>/i);
      if (match && match[1]) {
        url = match[1]; // Verwende die extrahierte URL
      }
    }

    // Prüfe, ob es sich um eine HTTP(S)-URL handelt
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false;
    }

    // Einfache Validierung für offensichtlich ungültige URLs
    if (url.includes(' ') || url.includes('\\')) {
      return false;
    }

    try {
      // Verwende URL-Objekt für robuste Validierung
      const urlObj = new URL(url);

      // Prüfe auf Bild-Dateiendungen
      const pathname = urlObj.pathname.toLowerCase();
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];

      // Prüfe, ob die URL auf eine der Bild-Dateiendungen endet
      return imageExtensions.some(ext => pathname.endsWith(ext));
    } catch (urlError) {
      return false;
    }
  } catch (error) {
    console.log("Error checking if URL is an image:", error);
    return false;
  }
}

/**
 * Verarbeitet den Nachrichteninhalt (Links, Bilder, etc.)
 * @param {string} content - Nachrichteninhalt
 * @returns {string} - Verarbeiteter Inhalt als HTML
 */
export function processMessageContent(content) {
  if (!content) return '';

  // Ersetze Zeilenumbrüche durch <br>
  let processedContent = content.replace(/\n/g, '<br>');

  // Markiere HTML-Tags, damit sie nicht doppelt verarbeitet werden
  let processedWithMarkers = processedContent.replace(
    /(<a\s+[^>]*>.*?<\/a>)/gi,
    '###LINK_MARKER###$1###LINK_MARKER###'
  );

  // Ersetze URLs durch klickbare Links, aber nur außerhalb der Marker
  processedWithMarkers = processedWithMarkers.replace(
    /(https?:\/\/[^\s<>"]+)/g,
    function(url) {
      // Überspringe URLs, die bereits in einem Link sind (zwischen Markern)
      if (processedWithMarkers.indexOf(`###LINK_MARKER###${url}`) !== -1 ||
          processedWithMarkers.indexOf(`${url}###LINK_MARKER###`) !== -1) {
        return url;
      }

      // Prüfe, ob es sich um ein Bild handelt
      if (isImageUrl(url)) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a><br><img src="${url}" alt="Bild" class="message-image">`;
      } else {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
      }
    }
  );

  // Entferne die Marker
  processedContent = processedWithMarkers.replace(/###LINK_MARKER###/g, '');

  // Prüfe auf HTML-Tags für Bilder (nach der URL-Verarbeitung)
  processedContent = processedContent.replace(
    /<a\s+href="(https?:\/\/[^"]+)"[^>]*>(.*?)<\/a>/gi,
    function(match, url, text) {
      // Prüfe, ob es sich um ein Bild handelt und ob es noch nicht als Bild dargestellt wird
      if (isImageUrl(url) && !match.includes('<img')) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a><br><img src="${url}" alt="Bild" class="message-image">`;
      } else {
        return match; // Behalte den ursprünglichen HTML-Tag bei
      }
    }
  );

  return processedContent;
}
