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
  try {
    if (!url || typeof url !== 'string') {
      return false;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false;
    }
    
    if (url.includes(' ') || url.includes('..') || url.includes('\\')) {
      return false;
    }
    
    const urlRegex = /^(https?:\/\/)([\da-z.-]+)\.([a-z.]{2,6})([/\w.-]*)*\/?$/i;
    if (!urlRegex.test(url)) {
      return false;
    }
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      return pathname.endsWith('.jpg') || 
             pathname.endsWith('.jpeg') || 
             pathname.endsWith('.png') || 
             pathname.endsWith('.gif') || 
             pathname.endsWith('.webp');
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

  // Ersetze URLs durch klickbare Links
  processedContent = processedContent.replace(
    /(https?:\/\/[^\s]+)/g,
    function(url) {
      // Prüfe, ob es sich um ein Bild handelt
      if (isImageUrl(url)) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a><br><img src="${url}" alt="Bild" class="message-image">`;
      } else {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
      }
    }
  );

  return processedContent;
}
