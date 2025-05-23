import { expect } from '@open-wc/testing';
import { hexToBytes, bytesToHex, formatTimestamp, isImageUrl, processMessageContent } from '../src/utils/helpers.js';

describe('Helpers', () => {
  describe('hexToBytes', () => {
    it('should convert a hex string to Uint8Array', () => {
      const hex = '0123456789abcdef';
      const bytes = hexToBytes(hex);

      expect(bytes).to.be.an.instanceOf(Uint8Array);
      expect(bytes.length).to.equal(8);
      expect(bytes[0]).to.equal(1);
      expect(bytes[1]).to.equal(35);
      expect(bytes[2]).to.equal(69);
      expect(bytes[3]).to.equal(103);
      expect(bytes[4]).to.equal(137);
      expect(bytes[5]).to.equal(171);
      expect(bytes[6]).to.equal(205);
      expect(bytes[7]).to.equal(239);
    });

    it('should handle empty input', () => {
      const bytes = hexToBytes('');

      expect(bytes).to.be.an.instanceOf(Uint8Array);
      expect(bytes.length).to.equal(0);
    });

    it('should handle null input', () => {
      const bytes = hexToBytes(null);

      expect(bytes).to.be.an.instanceOf(Uint8Array);
      expect(bytes.length).to.equal(0);
    });

    it('should handle 0x prefix', () => {
      const hex = '0x0123';
      const bytes = hexToBytes(hex);

      expect(bytes).to.be.an.instanceOf(Uint8Array);
      expect(bytes.length).to.equal(2);
      expect(bytes[0]).to.equal(1);
      expect(bytes[1]).to.equal(35);
    });

    it('should handle odd length by padding with 0', () => {
      const hex = '123';
      const bytes = hexToBytes(hex);

      expect(bytes).to.be.an.instanceOf(Uint8Array);
      expect(bytes.length).to.equal(2);
      expect(bytes[0]).to.equal(1);
      expect(bytes[1]).to.equal(35);
    });
  });

  describe('bytesToHex', () => {
    it('should convert a Uint8Array to hex string', () => {
      const bytes = new Uint8Array([1, 35, 69, 103, 137, 171, 205, 239]);
      const hex = bytesToHex(bytes);

      expect(hex).to.equal('0123456789abcdef');
    });

    it('should handle empty input', () => {
      const hex = bytesToHex(new Uint8Array(0));

      expect(hex).to.equal('');
    });

    it('should handle null input', () => {
      const hex = bytesToHex(null);

      expect(hex).to.equal('');
    });

    it('should pad single digit values with 0', () => {
      const bytes = new Uint8Array([0, 1, 10, 15]);
      const hex = bytesToHex(bytes);

      expect(hex).to.equal('00010a0f');
    });
  });

  describe('formatTimestamp', () => {
    it('should format a timestamp as a readable time', () => {
      // Erstelle einen Zeitstempel für 10:30 Uhr
      const date = new Date();
      date.setHours(10, 30, 0, 0);
      const timestamp = Math.floor(date.getTime() / 1000);

      const formattedTime = formatTimestamp(timestamp);

      // Da die Formatierung von der Locale abhängt, prüfen wir nur, ob das Ergebnis ein String ist
      expect(formattedTime).to.be.a('string');
      expect(formattedTime.length).to.be.greaterThan(0);
    });

    it('should handle empty input', () => {
      const formattedTime = formatTimestamp('');

      expect(formattedTime).to.equal('');
    });

    it('should handle null input', () => {
      const formattedTime = formatTimestamp(null);

      expect(formattedTime).to.equal('');
    });
  });

  describe('isImageUrl', () => {
    it('should return true for valid image URLs', () => {
      expect(isImageUrl('https://example.com/image.jpg')).to.be.true;
      expect(isImageUrl('https://example.com/image.jpeg')).to.be.true;
      expect(isImageUrl('https://example.com/image.png')).to.be.true;
      expect(isImageUrl('https://example.com/image.gif')).to.be.true;
      expect(isImageUrl('https://example.com/image.webp')).to.be.true;
    });

    it('should return true for complex image URLs with query parameters', () => {
      expect(isImageUrl('https://media4.giphy.com/media/cYZkY9HeKgofpQnOUl/200.gif?cid=6c45107dd5h1qtgc6y7o7wgx0p4iylmnknjk3i9svmoosjfv&ep=v1_gifs_trending&rid=200.gif&ct=g')).to.be.true;
      expect(isImageUrl('https://example.com/image.jpg?width=800&height=600')).to.be.true;
      expect(isImageUrl('https://example.com/path/to/image.png?v=1.2.3')).to.be.true;
    });

    it('should return true for image URLs in HTML tags', () => {
      expect(isImageUrl('<a href="https://example.com/image.jpg">Image</a>')).to.be.true;
      expect(isImageUrl('<a href="https://media4.giphy.com/media/cYZkY9HeKgofpQnOUl/200.gif?cid=6c45107dd5h1qtgc6y7o7wgx0p4iylmnknjk3i9svmoosjfv&ep=v1_gifs_trending&rid=200.gif&ct=g">GIF</a>')).to.be.true;
    });

    it('should return false for non-image URLs', () => {
      expect(isImageUrl('https://example.com/page.html')).to.be.false;
      expect(isImageUrl('https://example.com/document.pdf')).to.be.false;
      expect(isImageUrl('https://example.com/')).to.be.false;
    });

    it('should return false for invalid URLs', () => {
      expect(isImageUrl('not-a-url')).to.be.false;
      expect(isImageUrl('http://invalid url.com')).to.be.false;
      expect(isImageUrl('http://example.com\\path')).to.be.false;
    });

    it('should return false for non-http URLs', () => {
      expect(isImageUrl('ftp://example.com/image.jpg')).to.be.false;
      expect(isImageUrl('file:///path/to/image.jpg')).to.be.false;
    });

    it('should handle empty input', () => {
      expect(isImageUrl('')).to.be.false;
    });

    it('should handle null input', () => {
      expect(isImageUrl(null)).to.be.false;
    });
  });

  describe('processMessageContent', () => {
    it('should replace newlines with <br>', () => {
      const content = 'Line 1\nLine 2';
      const processed = processMessageContent(content);

      expect(processed).to.equal('Line 1<br>Line 2');
    });

    it('should replace URLs with clickable links', () => {
      const content = 'Check out https://example.com';
      const processed = processMessageContent(content);

      expect(processed).to.include('<a href="https://example.com"');
      expect(processed).to.include('target="_blank"');
      expect(processed).to.include('rel="noopener noreferrer"');
    });

    it('should add image tags for image URLs', () => {
      const content = 'Check out https://example.com/image.jpg';
      const processed = processMessageContent(content);

      expect(processed).to.include('<a href="https://example.com/image.jpg"');
      expect(processed).to.include('<img src="https://example.com/image.jpg"');
      expect(processed).to.include('class="message-image"');
    });

    it('should handle complex image URLs with query parameters', () => {
      const content = 'Check out this GIF: https://media4.giphy.com/media/cYZkY9HeKgofpQnOUl/200.gif?cid=6c45107dd5h1qtgc6y7o7wgx0p4iylmnknjk3i9svmoosjfv&ep=v1_gifs_trending&rid=200.gif&ct=g';
      const processed = processMessageContent(content);

      expect(processed).to.include('<a href="https://media4.giphy.com/media/cYZkY9HeKgofpQnOUl/200.gif?cid=6c45107dd5h1qtgc6y7o7wgx0p4iylmnknjk3i9svmoosjfv&ep=v1_gifs_trending&rid=200.gif&ct=g"');
      expect(processed).to.include('<img src="https://media4.giphy.com/media/cYZkY9HeKgofpQnOUl/200.gif?cid=6c45107dd5h1qtgc6y7o7wgx0p4iylmnknjk3i9svmoosjfv&ep=v1_gifs_trending&rid=200.gif&ct=g"');
      expect(processed).to.include('class="message-image"');
    });

    it('should handle image URLs in HTML tags', () => {
      const content = 'Check out this image: <a href="https://example.com/image.jpg">Image</a>';
      const processed = processMessageContent(content);

      expect(processed).to.include('<a href="https://example.com/image.jpg"');
      expect(processed).to.include('<img src="https://example.com/image.jpg"');
      expect(processed).to.include('class="message-image"');
    });

    it('should handle multiple URLs', () => {
      const content = 'Check out https://example.com and https://example.org';
      const processed = processMessageContent(content);

      expect(processed).to.include('<a href="https://example.com"');
      expect(processed).to.include('<a href="https://example.org"');
    });

    it('should not process URLs that are already in links', () => {
      const content = 'Check out <a href="https://example.com">https://example.com</a>';
      const processed = processMessageContent(content);

      // Sollte nicht doppelt verarbeitet werden
      const matches = processed.match(/<a[^>]*>/g);
      expect(matches).to.have.lengthOf(1);
    });

    it('should handle empty input', () => {
      const processed = processMessageContent('');

      expect(processed).to.equal('');
    });

    it('should handle null input', () => {
      const processed = processMessageContent(null);

      expect(processed).to.equal('');
    });
  });
});
