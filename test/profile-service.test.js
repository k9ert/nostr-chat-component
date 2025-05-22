import { expect } from '@open-wc/testing';
import { loadProfileInfo, getDisplayName, getProfilePicture, updateProfile, clearProfile, clearAllProfiles } from '../src/services/profile-service.js';
import { EVENT_TYPES } from '../src/utils/constants.js';

// Mock für den SimplePool
class MockSimplePool {
  constructor() {
    this.subs = [];
  }

  subscribe(relays, filters, callbacks) {
    const sub = {
      id: Math.random().toString(36).substring(2, 15),
      close() {
        return this;
      }
    };

    this.subs.push({ sub, callbacks });
    return sub;
  }

  // Hilfsmethode für Tests
  simulateEvent(index, event) {
    if (this.subs[index] && this.subs[index].callbacks.onevent) {
      this.subs[index].callbacks.onevent(event);
    }
  }
}

describe('Profile Service', () => {
  let relayPool;
  let mockEvent;

  beforeEach(() => {
    relayPool = new MockSimplePool();
    mockEvent = {
      id: 'test-id',
      pubkey: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      created_at: Math.floor(Date.now() / 1000),
      content: 'Test message',
      tags: []
    };

    // Lösche alle Profile vor jedem Test
    clearAllProfiles();
  });

  describe('loadProfileInfo', () => {
    it('should load profile info from relay', (done) => {
      const profileData = {
        name: 'Test User',
        display_name: 'Test',
        picture: 'https://example.com/pic.jpg'
      };

      loadProfileInfo(mockEvent.pubkey, relayPool, ['wss://relay.com'], (profile) => {
        expect(profile).to.deep.equal(profileData);
        done();
      });

      // Simuliere den Empfang eines Profil-Events
      const profileEvent = {
        kind: EVENT_TYPES.METADATA,
        pubkey: mockEvent.pubkey,
        content: JSON.stringify(profileData)
      };

      // Löse das Event aus
      relayPool.simulateEvent(0, profileEvent);
    });

    it('should return cached profile info if available', (done) => {
      const profileData = {
        name: 'Test User',
        display_name: 'Test',
        picture: 'https://example.com/pic.jpg'
      };

      // Aktualisiere das Profil im Cache
      updateProfile(mockEvent.pubkey, profileData);

      loadProfileInfo(mockEvent.pubkey, relayPool, ['wss://relay.com'], (profile) => {
        expect(profile).to.deep.equal(profileData);
        done();
      });
    });

    it('should handle errors when parsing profile info', (done) => {
      loadProfileInfo(mockEvent.pubkey, relayPool, ['wss://relay.com'], (profile) => {
        expect(profile).to.be.null;
        done();
      });

      // Simuliere den Empfang eines ungültigen Profil-Events
      const invalidProfileEvent = {
        kind: EVENT_TYPES.METADATA,
        pubkey: mockEvent.pubkey,
        content: 'invalid-json'
      };

      // Löse das Event aus
      relayPool.simulateEvent(0, invalidProfileEvent);
    });
  });

  describe('getDisplayName', () => {
    it('should return the name from profile if available', () => {
      const profile = {
        name: 'Test User',
        display_name: 'Test'
      };

      const displayName = getDisplayName(mockEvent, profile);
      expect(displayName).to.equal('Test User');
    });

    it('should return the display_name if name is not available', () => {
      const profile = {
        display_name: 'Test'
      };

      const displayName = getDisplayName(mockEvent, profile);
      expect(displayName).to.equal('Test');
    });

    it('should return the name from cached profile if available', () => {
      const profile = {
        name: 'Test User',
        display_name: 'Test'
      };

      // Aktualisiere das Profil im Cache
      updateProfile(mockEvent.pubkey, profile);

      const displayName = getDisplayName(mockEvent);
      expect(displayName).to.equal('Test User');
    });

    it('should return truncated pubkey if no name is available', () => {
      const displayName = getDisplayName(mockEvent);
      expect(displayName).to.equal('12345678...');
    });
  });

  describe('getProfilePicture', () => {
    it('should return the picture from profile if available', () => {
      const profile = {
        picture: 'https://example.com/pic.jpg'
      };

      const picture = getProfilePicture(mockEvent, profile);
      expect(picture).to.equal('https://example.com/pic.jpg');
    });

    it('should return the picture from cached profile if available', () => {
      const profile = {
        picture: 'https://example.com/pic.jpg'
      };

      // Aktualisiere das Profil im Cache
      updateProfile(mockEvent.pubkey, profile);

      const picture = getProfilePicture(mockEvent);
      expect(picture).to.equal('https://example.com/pic.jpg');
    });

    it('should return null if no picture is available', () => {
      const picture = getProfilePicture(mockEvent);
      expect(picture).to.be.null;
    });
  });

  describe('updateProfile', () => {
    it('should update the profile in the cache', () => {
      const profile = {
        name: 'Test User',
        display_name: 'Test',
        picture: 'https://example.com/pic.jpg'
      };

      updateProfile(mockEvent.pubkey, profile);

      const displayName = getDisplayName(mockEvent);
      expect(displayName).to.equal('Test User');

      const picture = getProfilePicture(mockEvent);
      expect(picture).to.equal('https://example.com/pic.jpg');
    });
  });

  describe('clearProfile', () => {
    it('should clear the profile from the cache', () => {
      const profile = {
        name: 'Test User',
        display_name: 'Test',
        picture: 'https://example.com/pic.jpg'
      };

      // Aktualisiere das Profil im Cache
      updateProfile(mockEvent.pubkey, profile);

      // Lösche das Profil aus dem Cache
      clearProfile(mockEvent.pubkey);

      const displayName = getDisplayName(mockEvent);
      expect(displayName).to.equal('12345678...');

      const picture = getProfilePicture(mockEvent);
      expect(picture).to.be.null;
    });
  });

  describe('clearAllProfiles', () => {
    it('should clear all profiles from the cache', () => {
      const profile1 = {
        name: 'Test User 1',
        picture: 'https://example.com/pic1.jpg'
      };

      const profile2 = {
        name: 'Test User 2',
        picture: 'https://example.com/pic2.jpg'
      };

      // Aktualisiere die Profile im Cache
      updateProfile(mockEvent.pubkey, profile1);
      updateProfile('another-pubkey', profile2);

      // Lösche alle Profile aus dem Cache
      clearAllProfiles();

      const displayName = getDisplayName(mockEvent);
      expect(displayName).to.equal('12345678...');

      const picture = getProfilePicture(mockEvent);
      expect(picture).to.be.null;
    });
  });
});
