import { expect } from '@open-wc/testing';
import { DEFAULT_RELAYS, EVENT_TYPES, MAX_CACHED_MESSAGES, MAX_CACHED_PROFILES, RECONNECT_INTERVAL, MAX_RECONNECT_ATTEMPTS, DEFAULT_SETTINGS } from '../src/utils/constants.js';

describe('Constants', () => {
  describe('DEFAULT_RELAYS', () => {
    it('should be an array of relay URLs', () => {
      expect(DEFAULT_RELAYS).to.be.an('array');
      expect(DEFAULT_RELAYS.length).to.be.greaterThan(0);
      
      DEFAULT_RELAYS.forEach(relay => {
        expect(relay).to.be.a('string');
        expect(relay).to.match(/^wss:\/\//);
      });
    });
  });
  
  describe('EVENT_TYPES', () => {
    it('should define all required event types', () => {
      expect(EVENT_TYPES).to.be.an('object');
      
      // Überprüfe, ob alle erforderlichen Event-Typen definiert sind
      expect(EVENT_TYPES).to.have.property('METADATA').that.equals(0);
      expect(EVENT_TYPES).to.have.property('TEXT_NOTE').that.equals(1);
      expect(EVENT_TYPES).to.have.property('CHANNEL_CREATE').that.equals(40);
      expect(EVENT_TYPES).to.have.property('CHANNEL_METADATA').that.equals(41);
      expect(EVENT_TYPES).to.have.property('CHANNEL_MESSAGE').that.equals(42);
    });
  });
  
  describe('MAX_CACHED_MESSAGES', () => {
    it('should be a positive number', () => {
      expect(MAX_CACHED_MESSAGES).to.be.a('number');
      expect(MAX_CACHED_MESSAGES).to.be.greaterThan(0);
    });
  });
  
  describe('MAX_CACHED_PROFILES', () => {
    it('should be a positive number', () => {
      expect(MAX_CACHED_PROFILES).to.be.a('number');
      expect(MAX_CACHED_PROFILES).to.be.greaterThan(0);
    });
  });
  
  describe('RECONNECT_INTERVAL', () => {
    it('should be a positive number', () => {
      expect(RECONNECT_INTERVAL).to.be.a('number');
      expect(RECONNECT_INTERVAL).to.be.greaterThan(0);
    });
  });
  
  describe('MAX_RECONNECT_ATTEMPTS', () => {
    it('should be a positive number', () => {
      expect(MAX_RECONNECT_ATTEMPTS).to.be.a('number');
      expect(MAX_RECONNECT_ATTEMPTS).to.be.greaterThan(0);
    });
  });
  
  describe('DEFAULT_SETTINGS', () => {
    it('should define all required settings', () => {
      expect(DEFAULT_SETTINGS).to.be.an('object');
      
      // Überprüfe, ob alle erforderlichen Einstellungen definiert sind
      expect(DEFAULT_SETTINGS).to.have.property('relay').that.is.a('string');
      expect(DEFAULT_SETTINGS).to.have.property('channel').that.is.a('string');
      expect(DEFAULT_SETTINGS).to.have.property('theme').that.is.a('string');
      expect(DEFAULT_SETTINGS).to.have.property('showAvatars').that.is.a('boolean');
      expect(DEFAULT_SETTINGS).to.have.property('maxMessages').that.is.a('number');
    });
    
    it('should have valid values', () => {
      expect(DEFAULT_SETTINGS.relay).to.match(/^wss:\/\//);
      expect(DEFAULT_SETTINGS.channel).to.have.lengthOf.at.least(1);
      expect(['light', 'dark']).to.include(DEFAULT_SETTINGS.theme);
      expect(DEFAULT_SETTINGS.maxMessages).to.be.greaterThan(0);
    });
  });
});
