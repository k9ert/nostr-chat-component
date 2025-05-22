/**
 * Profil-Dienst für die Nostr-Chat-Komponente
 */
import { EVENT_TYPES, MAX_CACHED_PROFILES } from '../utils/constants.js';

// Cache für Profilinformationen
const profileCache = new Map();

/**
 * Lädt Profilinformationen für einen Benutzer
 * @param {string} pubkey - Öffentlicher Schlüssel des Benutzers
 * @param {Object} relayPool - Relay-Pool
 * @param {Array} relays - Liste der Relays
 * @param {Function} callback - Callback-Funktion, die aufgerufen wird, wenn die Profilinformationen geladen wurden
 */
export function loadProfileInfo(pubkey, relayPool, relays, callback) {
  // Prüfe, ob die Profilinformationen bereits im Cache sind
  if (profileCache.has(pubkey)) {
    callback(profileCache.get(pubkey));
    return;
  }

  // Erstelle eine Subscription für Metadaten-Events
  const sub = relayPool.subscribe(relays, [
    {
      kinds: [EVENT_TYPES.METADATA],
      authors: [pubkey],
      limit: 1
    }
  ], {
    onevent(event) {
      try {
        // Versuche, die Profilinformationen zu parsen
        const profile = JSON.parse(event.content);

        // Speichere die Profilinformationen im Cache
        profileCache.set(pubkey, profile);

        // Rufe den Callback mit den Profilinformationen auf
        callback(profile);

        // Bereinige den Cache, wenn er zu groß wird
        if (profileCache.size > MAX_CACHED_PROFILES) {
          const oldestKey = profileCache.keys().next().value;
          profileCache.delete(oldestKey);
        }
      } catch (error) {
        console.error('Error parsing profile info:', error);
        callback(null);
      }
    },
    oneose() {
      // Wenn keine Profilinformationen gefunden wurden, rufe den Callback mit null auf
      if (!profileCache.has(pubkey)) {
        callback(null);
      }

      // Wir schließen die Subscription nicht mehr, da wir sie für die gesamte Lebensdauer der Anwendung verwenden
      // Die Subscription wird automatisch geschlossen, wenn sie nicht mehr benötigt wird
      console.log('Not closing profile subscription to maintain connection');
    }
  });
}

/**
 * Gibt den Anzeigenamen für ein Event zurück
 * @param {Object} event - Event
 * @param {Object} profile - Profilinformationen (optional)
 * @returns {string} - Anzeigename
 */
export function getDisplayName(event, profile = null) {
  // Wenn Profilinformationen übergeben wurden, verwende diese
  if (profile) {
    // Verwende den Namen aus dem Profil, falls vorhanden
    if (profile.name) return profile.name;

    // Verwende den Anzeigenamen aus dem Profil, falls vorhanden
    if (profile.display_name) return profile.display_name;
  }

  // Wenn keine Profilinformationen übergeben wurden, prüfe, ob sie im Cache sind
  if (!profile && profileCache.has(event.pubkey)) {
    const cachedProfile = profileCache.get(event.pubkey);
    if (cachedProfile.name) return cachedProfile.name;
    if (cachedProfile.display_name) return cachedProfile.display_name;
  }

  // Wenn kein Name gefunden wurde, verwende die ersten 8 Zeichen des öffentlichen Schlüssels
  return event.pubkey.substring(0, 8) + '...';
}

/**
 * Gibt das Profilbild für ein Event zurück
 * @param {Object} event - Event
 * @param {Object} profile - Profilinformationen (optional)
 * @returns {string|null} - URL des Profilbilds oder null, wenn keines gefunden wurde
 */
export function getProfilePicture(event, profile = null) {
  // Wenn Profilinformationen übergeben wurden, verwende diese
  if (profile) {
    // Verwende das Bild aus dem Profil, falls vorhanden
    if (profile.picture) return profile.picture;
  }

  // Wenn keine Profilinformationen übergeben wurden, prüfe, ob sie im Cache sind
  if (!profile && profileCache.has(event.pubkey)) {
    const cachedProfile = profileCache.get(event.pubkey);
    if (cachedProfile.picture) return cachedProfile.picture;
  }

  // Wenn kein Bild gefunden wurde, gib null zurück
  return null;
}

/**
 * Aktualisiert das Profil eines Benutzers
 * @param {string} pubkey - Öffentlicher Schlüssel des Benutzers
 * @param {Object} profile - Neue Profilinformationen
 */
export function updateProfile(pubkey, profile) {
  profileCache.set(pubkey, profile);
}

/**
 * Löscht das Profil eines Benutzers aus dem Cache
 * @param {string} pubkey - Öffentlicher Schlüssel des Benutzers
 */
export function clearProfile(pubkey) {
  profileCache.delete(pubkey);
}

/**
 * Löscht alle Profile aus dem Cache
 */
export function clearAllProfiles() {
  profileCache.clear();
}
