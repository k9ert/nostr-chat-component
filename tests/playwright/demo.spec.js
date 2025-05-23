// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Nostr Chat Component Demo', () => {
  test('should load the demo page', async ({ page }) => {
    // Navigiere zur Demo-Seite
    await page.goto('/demo/');
    
    // Überprüfe, ob der Titel korrekt ist
    await expect(page).toHaveTitle('Nostr Chat Component Demo');
    
    // Überprüfe, ob die Überschrift vorhanden ist
    const heading = page.locator('h1');
    await expect(heading).toHaveText('Nostr Chat Component');
  });

  test('should display the chat component', async ({ page }) => {
    // Navigiere zur Demo-Seite
    await page.goto('/demo/');
    
    // Warte auf die Nostr-Chat-Komponente
    const chatComponent = page.locator('nostr-chat');
    await expect(chatComponent).toBeVisible({ timeout: 10000 });
    
    // Überprüfe die Attribute der Komponente
    await expect(chatComponent).toHaveAttribute('relay', 'wss://relay.damus.io');
    await expect(chatComponent).toHaveAttribute('channel', 'nostr-chat-component-demo');
    await expect(chatComponent).toHaveAttribute('theme', 'light');
    await expect(chatComponent).toHaveAttribute('show-avatars', 'true');
    await expect(chatComponent).toHaveAttribute('max-messages', '50');
  });

  test('should update configuration when button is clicked', async ({ page }) => {
    // Navigiere zur Demo-Seite
    await page.goto('/demo/');
    
    // Ändere die Konfiguration
    await page.locator('#relay-input').fill('wss://relay.example.com');
    await page.locator('#channel-input').fill('test-channel');
    await page.locator('#theme-select').selectOption('dark');
    await page.locator('#avatars-checkbox').uncheck();
    await page.locator('#max-messages-input').fill('20');
    
    // Klicke auf den Update-Button
    await page.locator('#update-config-btn').click();
    
    // Überprüfe, ob die Attribute der Komponente aktualisiert wurden
    const chatComponent = page.locator('nostr-chat');
    await expect(chatComponent).toHaveAttribute('relay', 'wss://relay.example.com');
    await expect(chatComponent).toHaveAttribute('channel', 'test-channel');
    await expect(chatComponent).toHaveAttribute('theme', 'dark');
    await expect(chatComponent).toHaveAttribute('show-avatars', 'false');
    await expect(chatComponent).toHaveAttribute('max-messages', '20');
  });
});
